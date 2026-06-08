import type {
  CoinMarket,
  CoinMarketChart,
  CoinMarketChartPoint,
} from "@crypto-realtime-dashboard/shared-types";
import type { CoinGeckoMarketChartRaw, CoinGeckoMarketRaw } from "./types";

export function normalizeMarkets(payload: unknown): CoinMarket[] {
  if (!Array.isArray(payload)) {
    throw new Error("invalid_markets_payload");
  }

  return payload.map((item) => normalizeMarket(item));
}

export function normalizeMarketChart(payload: unknown): CoinMarketChart {
  if (!isRecord(payload)) {
    throw new Error("invalid_market_chart_payload");
  }

  const chart = payload as CoinGeckoMarketChartRaw;

  return {
    prices: normalizeSeries(chart.prices),
    marketCaps: normalizeSeries(chart.market_caps),
    totalVolumes: normalizeSeries(chart.total_volumes),
  };
}

function normalizeMarket(payload: unknown): CoinMarket {
  if (!isRecord(payload)) {
    throw new Error("invalid_market_payload");
  }

  const market = payload as CoinGeckoMarketRaw;
  const id = readString(market.id);
  const symbol = readString(market.symbol);
  const name = readString(market.name);
  const currentPriceUsd = readNumber(market.current_price);

  if (id === null || symbol === null || name === null || currentPriceUsd === null) {
    throw new Error("invalid_market_payload");
  }

  return {
    id,
    symbol,
    name,
    image: readNullableString(market.image),
    currentPriceUsd,
    marketCapUsd: readNullableNumber(market.market_cap),
    marketCapRank: readNullableNumber(market.market_cap_rank),
    totalVolumeUsd: readNullableNumber(market.total_volume),
    priceChangePercentage24h: readNullableNumber(market.price_change_percentage_24h),
    lastUpdated: readNullableString(market.last_updated),
  };
}

function normalizeSeries(payload: unknown): CoinMarketChartPoint[] {
  if (!Array.isArray(payload)) {
    throw new Error("invalid_market_chart_series");
  }

  return payload.map((point) => {
    if (!Array.isArray(point) || point.length < 2) {
      throw new Error("invalid_market_chart_point");
    }

    const timestamp = readNumber(point[0]);
    const value = readNumber(point[1]);

    if (timestamp === null || value === null) {
      throw new Error("invalid_market_chart_point");
    }

    return { timestamp, value };
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readNullableString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readNullableNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
