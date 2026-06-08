import type { CoinMarket, CoinMarketChart } from "@crypto-realtime-dashboard/shared-types";
import { readCachedJson, writeCachedJson } from "./cache";
import { normalizeMarketChart, normalizeMarkets } from "./normalize";
import type {
  CoinGeckoRequestOptions,
  NormalizedMarketChartPayload,
  NormalizedMarketPayload,
} from "./types";

const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3";
const DEFAULT_CURRENCY = "usd";
const MAX_MARKETS_PER_PAGE = 100;
const DEFAULT_MARKETS_PER_PAGE = 100;
const DEFAULT_MARKET_CHART_DAYS = "7";

export async function fetchCoinMarkets(options: CoinGeckoRequestOptions) {
  const query = new URLSearchParams({
    vs_currency: DEFAULT_CURRENCY,
    order: "market_cap_desc",
    per_page: String(DEFAULT_MARKETS_PER_PAGE),
    page: "1",
    sparkline: "false",
    price_change_percentage: "24h",
  });

  const cacheKey = `coingecko:coins:markets:${query.toString()}`;
  const cached = await readCachedJson<NormalizedMarketPayload>(
    options.cache,
    cacheKey,
    isNormalizedMarketPayload,
  );

  if (cached !== null) {
    return { cache: "hit" as const, data: cached.markets, fetchedAt: cached.fetchedAt };
  }

  const payload = await fetchCoinGeckoJson("/coins/markets", query, options);
  const markets = normalizeMarkets(payload).slice(0, MAX_MARKETS_PER_PAGE);
  const fetchedAt = new Date().toISOString();

  await writeCachedJson(options.cache, cacheKey, { markets, fetchedAt });

  return {
    cache: options.cache === undefined ? ("bypass" as const) : ("miss" as const),
    data: markets,
    fetchedAt,
  };
}

export async function fetchCoinMarketChart(id: string, options: CoinGeckoRequestOptions) {
  const safeId = normalizeCoinId(id);
  const query = new URLSearchParams({
    vs_currency: DEFAULT_CURRENCY,
    days: DEFAULT_MARKET_CHART_DAYS,
  });
  const cacheKey = `coingecko:coins:${safeId}:market-chart:${query.toString()}`;
  const cached = await readCachedJson<NormalizedMarketChartPayload>(
    options.cache,
    cacheKey,
    isNormalizedMarketChartPayload,
  );

  if (cached !== null) {
    return { cache: "hit" as const, data: cached.chart, fetchedAt: cached.fetchedAt };
  }

  const payload = await fetchCoinGeckoJson(`/coins/${safeId}/market_chart`, query, options);
  const chart = normalizeMarketChart(payload);
  const fetchedAt = new Date().toISOString();

  await writeCachedJson(options.cache, cacheKey, { chart, fetchedAt });

  return {
    cache: options.cache === undefined ? ("bypass" as const) : ("miss" as const),
    data: chart,
    fetchedAt,
  };
}

export function normalizeCoinId(id: string) {
  const trimmed = id.trim().toLowerCase();

  if (!/^[a-z0-9-]+$/.test(trimmed)) {
    throw new Error("invalid_coin_id");
  }

  return trimmed;
}

async function fetchCoinGeckoJson(
  path: string,
  query: URLSearchParams,
  options: CoinGeckoRequestOptions,
) {
  if (options.apiKey === undefined || options.apiKey.trim().length === 0) {
    throw new Error("missing_coingecko_api_key");
  }

  const url = new URL(`${COINGECKO_BASE_URL}${path}`);
  for (const [key, value] of query.entries()) {
    url.searchParams.set(key, value);
  }

  const fetcher = options.fetcher ?? fetch;
  const response = await fetcher(url, {
    headers: {
      // 公式docsでは、CoinGecko Demo API keyをこのheaderで送る方式が案内されている。
      "x-cg-demo-api-key": options.apiKey,
      accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("coingecko_upstream_error");
  }

  return response.json() as Promise<unknown>;
}

function isNormalizedMarketPayload(value: unknown): value is NormalizedMarketPayload {
  return (
    isRecord(value) &&
    Array.isArray(value.markets) &&
    typeof value.fetchedAt === "string" &&
    value.markets.every(isCoinMarket)
  );
}

function isNormalizedMarketChartPayload(value: unknown): value is NormalizedMarketChartPayload {
  return isRecord(value) && isCoinMarketChart(value.chart) && typeof value.fetchedAt === "string";
}

function isCoinMarket(value: unknown): value is CoinMarket {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.symbol === "string" &&
    typeof value.name === "string" &&
    typeof value.currentPriceUsd === "number"
  );
}

function isCoinMarketChart(value: unknown): value is CoinMarketChart {
  return (
    isRecord(value) &&
    Array.isArray(value.prices) &&
    Array.isArray(value.marketCaps) &&
    Array.isArray(value.totalVolumes)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
