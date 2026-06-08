import type {
  CandlestickPoint,
  ChartInterval,
  TradingPairSymbol,
} from "@crypto-realtime-dashboard/shared-types";
import {
  isSupportedChartInterval,
  isSupportedTradingPairSymbol,
} from "@crypto-realtime-dashboard/shared-types";

type CachePort = {
  get<TValue = unknown>(key: string, options?: { type: "json" }): Promise<TValue | null>;
  put(
    key: string,
    value: string,
    options?: {
      expirationTtl?: number;
    },
  ): Promise<void>;
};

type Fetcher = typeof fetch;

type BinanceKlinesOptions = {
  cache?: CachePort;
  fetcher?: Fetcher;
};

type CachedKlinesPayload = {
  candles: CandlestickPoint[];
  fetchedAt: string;
};

const BINANCE_MARKET_DATA_BASE_URL = "https://data-api.binance.vision";
const BINANCE_KLINES_LIMIT = 120;
const BINANCE_KLINES_CACHE_TTL_SECONDS = 30;

export class BinanceUpstreamHttpError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number) {
    super("binance_upstream_http_error");
    this.name = "BinanceUpstreamHttpError";
    this.statusCode = statusCode;
  }
}

export async function fetchBinanceKlines(
  symbol: string,
  interval: string,
  options: BinanceKlinesOptions,
) {
  const safeSymbol = normalizeTradingPairSymbol(symbol);
  const safeInterval = normalizeChartInterval(interval);
  const query = new URLSearchParams({
    symbol: safeSymbol,
    interval: safeInterval,
    limit: String(BINANCE_KLINES_LIMIT),
  });
  const cacheKey = `binance:klines:${query.toString()}`;
  const cached = await readCachedKlines(options.cache, cacheKey);

  if (cached !== null) {
    return {
      cache: "hit" as const,
      data: cached.candles,
      fetchedAt: cached.fetchedAt,
      interval: safeInterval,
      symbol: safeSymbol,
    };
  }

  const payload = await fetchBinanceJson("/api/v3/klines", query, options.fetcher ?? fetch);
  const candles = normalizeBinanceKlines(payload);
  const fetchedAt = new Date().toISOString();

  await writeCachedKlines(options.cache, cacheKey, { candles, fetchedAt });

  return {
    cache: options.cache === undefined ? ("bypass" as const) : ("miss" as const),
    data: candles,
    fetchedAt,
    interval: safeInterval,
    symbol: safeSymbol,
  };
}

export function normalizeTradingPairSymbol(value: string): TradingPairSymbol {
  const symbol = value.trim().toUpperCase();

  if (!isSupportedTradingPairSymbol(symbol)) {
    throw new Error("invalid_binance_symbol");
  }

  return symbol;
}

export function normalizeChartInterval(value: string): ChartInterval {
  const interval = value.trim();

  if (!isSupportedChartInterval(interval)) {
    throw new Error("invalid_binance_interval");
  }

  return interval;
}

export function normalizeBinanceKlines(payload: unknown) {
  if (!Array.isArray(payload)) {
    throw new Error("invalid_binance_klines_payload");
  }

  const candles = payload.map((row) => normalizeBinanceKlineRow(row));

  if (candles.length === 0) {
    throw new Error("invalid_binance_klines_payload");
  }

  return candles;
}

async function fetchBinanceJson(path: string, query: URLSearchParams, fetcher: Fetcher) {
  const url = new URL(`${BINANCE_MARKET_DATA_BASE_URL}${path}`);
  for (const [key, value] of query.entries()) {
    url.searchParams.set(key, value);
  }

  const response = await fetcher(url.toString(), {
    headers: {
      accept: "application/json",
    },
  }).catch(() => {
    throw new Error("binance_network_error");
  });

  if (!response.ok) {
    throw new BinanceUpstreamHttpError(response.status);
  }

  return response.json() as Promise<unknown>;
}

function normalizeBinanceKlineRow(row: unknown): CandlestickPoint {
  if (!Array.isArray(row) || row.length < 8) {
    throw new Error("invalid_binance_klines_payload");
  }

  return {
    timestamp: readTimestamp(row[0]),
    open: readFiniteNumber(row[1]),
    high: readFiniteNumber(row[2]),
    low: readFiniteNumber(row[3]),
    close: readFiniteNumber(row[4]),
    volume: readFiniteNumber(row[5]),
    quoteVolume: readFiniteNumber(row[7]),
  };
}

async function readCachedKlines(cache: CachePort | undefined, key: string) {
  if (cache === undefined) {
    return null;
  }

  const cached = await cache.get(key, { type: "json" }).catch(() => null);

  return isCachedKlinesPayload(cached) ? cached : null;
}

async function writeCachedKlines(
  cache: CachePort | undefined,
  key: string,
  value: CachedKlinesPayload,
) {
  if (cache === undefined) {
    return;
  }

  await cache
    .put(key, JSON.stringify(value), {
      expirationTtl: BINANCE_KLINES_CACHE_TTL_SECONDS,
    })
    .catch(() => undefined);
}

function isCachedKlinesPayload(value: unknown): value is CachedKlinesPayload {
  return (
    isRecord(value) &&
    typeof value.fetchedAt === "string" &&
    Array.isArray(value.candles) &&
    value.candles.every(isCandlestickPoint)
  );
}

function isCandlestickPoint(value: unknown): value is CandlestickPoint {
  return (
    isRecord(value) &&
    typeof value.timestamp === "number" &&
    typeof value.open === "number" &&
    typeof value.high === "number" &&
    typeof value.low === "number" &&
    typeof value.close === "number" &&
    typeof value.volume === "number" &&
    typeof value.quoteVolume === "number"
  );
}

function readTimestamp(value: unknown) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error("invalid_binance_klines_payload");
  }

  return value;
}

function readFiniteNumber(value: unknown) {
  const numericValue = typeof value === "string" ? Number(value) : value;

  if (typeof numericValue !== "number" || !Number.isFinite(numericValue)) {
    throw new Error("invalid_binance_klines_payload");
  }

  return numericValue;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
