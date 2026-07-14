import type {
  ApiErrorResponse,
  CandlestickPoint,
  ChartInterval,
  CoinMarket,
  CoinMarketChart,
  MarketDataResponse,
  MarketPairSymbol,
} from "@crypto-realtime-dashboard/shared-types";
import { getBffOrigin, normalizeBffOrigin } from "./config";

export class MarketApiError extends Error {
  readonly status: number;
  readonly type: ApiErrorResponse["error"]["type"] | "unknown";

  constructor(
    status: number,
    type: ApiErrorResponse["error"]["type"] | "unknown",
    message: string,
  ) {
    super(message);
    this.name = "MarketApiError";
    this.status = status;
    this.type = type;
  }
}

export async function getCoinMarkets() {
  return fetchJson<MarketDataResponse<CoinMarket[]>>(createApiPath("/api/coingecko/coins/markets"));
}

export async function getCoinMarketChart(coinId: string) {
  return fetchJson<MarketDataResponse<CoinMarketChart>>(createCoinMarketChartPath(coinId));
}

export async function getMarketCandles(symbol: MarketPairSymbol, interval: ChartInterval) {
  return fetchJson<MarketDataResponse<CandlestickPoint[]>>(
    createMarketCandlesPath(symbol, interval),
  );
}

export function createMarketCandlesPath(symbol: MarketPairSymbol, interval: ChartInterval) {
  const query = new URLSearchParams({
    symbol,
    interval,
  });

  return createApiPath(`/api/market/candles?${query.toString()}`);
}

export function createCoinMarketChartPath(coinId: string) {
  if (coinId.trim() === "") {
    throw new Error("invalid_coin_id");
  }

  return createApiPath(`/api/coingecko/coins/${encodeURIComponent(coinId)}/market_chart`);
}

export function createApiPath(path: string, bffOrigin = getBffOrigin()) {
  if (!path.startsWith("/api/")) {
    throw new Error("invalid_api_path");
  }

  const origin = normalizeBffOrigin(bffOrigin);
  if (origin !== "") {
    return `${origin}${path}`;
  }

  return path;
}

async function fetchJson<TResponse>(path: string) {
  const response = await fetch(path, {
    headers: {
      accept: "application/json",
    },
  });
  const payload = (await response.json()) as unknown;

  if (!response.ok) {
    const error = readApiError(payload);
    throw new MarketApiError(response.status, error.type, error.message);
  }

  return payload as TResponse;
}

function readApiError(payload: unknown) {
  if (isRecord(payload) && isRecord(payload.error)) {
    const type = payload.error.type;
    const message = payload.error.message;

    if (isKnownApiErrorType(type) && typeof message === "string") {
      return { type, message };
    }
  }

  return {
    type: "unknown" as const,
    message: "Market API request failed.",
  };
}

function isKnownApiErrorType(value: unknown): value is ApiErrorResponse["error"]["type"] {
  return (
    value === "configuration_error" ||
    value === "upstream_error" ||
    value === "upstream_http_error" ||
    value === "upstream_network_error" ||
    value === "rate_limited" ||
    value === "invalid_request" ||
    value === "invalid_upstream_payload"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
