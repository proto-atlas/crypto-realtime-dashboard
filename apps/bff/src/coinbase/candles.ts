import type {
  CandlestickPoint,
  ChartInterval,
  MarketPairSymbol,
} from "@crypto-realtime-dashboard/shared-types";
import {
  isSupportedChartInterval,
  isSupportedMarketPairSymbol,
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

type CoinbaseCandlesOptions = {
  cache?: CachePort;
  fetcher?: typeof fetch;
};

type CachedCandlesPayload = {
  candles: CandlestickPoint[];
  fetchedAt: string;
};

const COINBASE_MARKET_DATA_BASE_URL = "https://api.exchange.coinbase.com";
const COINBASE_CANDLES_LIMIT = 120;
const COINBASE_CANDLES_CACHE_TTL_SECONDS = 30;
const COINBASE_USER_AGENT = "crypto-realtime-dashboard/1.0";

const intervalGranularity: Readonly<Record<ChartInterval, number>> = {
  "1m": 60,
  "5m": 300,
  "15m": 900,
  "1h": 3600,
  "1d": 86400,
};

export class CoinbaseUpstreamHttpError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number) {
    super("coinbase_upstream_http_error");
    this.name = "CoinbaseUpstreamHttpError";
    this.statusCode = statusCode;
  }
}

export async function fetchCoinbaseCandles(
  symbol: string,
  interval: string,
  options: CoinbaseCandlesOptions,
) {
  const safeSymbol = normalizeMarketPairSymbol(symbol);
  const safeInterval = normalizeChartInterval(interval);
  const cacheKey = `coinbase:candles:${safeSymbol}:${safeInterval}`;
  const cached = await readCachedCandles(options.cache, cacheKey);

  if (cached !== null) {
    return {
      cache: "hit" as const,
      data: cached.candles,
      fetchedAt: cached.fetchedAt,
      interval: safeInterval,
      symbol: safeSymbol,
    };
  }

  const payload = await fetchCoinbaseJson(
    safeSymbol,
    intervalGranularity[safeInterval],
    options.fetcher ?? fetch,
  );
  const candles = normalizeCoinbaseCandles(payload);
  const fetchedAt = new Date().toISOString();

  await writeCachedCandles(options.cache, cacheKey, { candles, fetchedAt });

  return {
    cache: options.cache === undefined ? ("bypass" as const) : ("miss" as const),
    data: candles,
    fetchedAt,
    interval: safeInterval,
    symbol: safeSymbol,
  };
}

export function normalizeMarketPairSymbol(value: string): MarketPairSymbol {
  const symbol = value.trim().toUpperCase();

  if (!isSupportedMarketPairSymbol(symbol)) {
    throw new Error("invalid_market_pair_symbol");
  }

  return symbol;
}

export function normalizeChartInterval(value: string): ChartInterval {
  const interval = value.trim();

  if (!isSupportedChartInterval(interval)) {
    throw new Error("invalid_chart_interval");
  }

  return interval;
}

export function normalizeCoinbaseCandles(payload: unknown) {
  if (!Array.isArray(payload)) {
    throw new Error("invalid_coinbase_candles_payload");
  }

  const candlesByTimestamp = new Map<number, CandlestickPoint>();

  for (const row of payload) {
    const candle = normalizeCoinbaseCandleRow(row);
    candlesByTimestamp.set(candle.timestamp, candle);
  }

  const candles = Array.from(candlesByTimestamp.values()).sort(
    (left, right) => left.timestamp - right.timestamp,
  );

  if (candles.length === 0) {
    throw new Error("invalid_coinbase_candles_payload");
  }

  return candles.slice(-COINBASE_CANDLES_LIMIT);
}

async function fetchCoinbaseJson(
  symbol: MarketPairSymbol,
  granularity: number,
  fetcher: typeof fetch,
) {
  const url = new URL(`${COINBASE_MARKET_DATA_BASE_URL}/products/${symbol}/candles`);
  url.searchParams.set("granularity", String(granularity));

  const response = await fetcher(url.toString(), {
    headers: {
      accept: "application/json",
      "user-agent": COINBASE_USER_AGENT,
    },
  }).catch(() => {
    throw new Error("coinbase_network_error");
  });

  if (!response.ok) {
    throw new CoinbaseUpstreamHttpError(response.status);
  }

  return response.json().catch(() => {
    throw new Error("invalid_coinbase_candles_payload");
  }) as Promise<unknown>;
}

function normalizeCoinbaseCandleRow(row: unknown): CandlestickPoint {
  if (!Array.isArray(row) || row.length < 6) {
    throw new Error("invalid_coinbase_candles_payload");
  }

  const timestamp = readTimestampSeconds(row[0]) * 1000;
  const low = readFiniteNumber(row[1]);
  const high = readFiniteNumber(row[2]);
  const open = readFiniteNumber(row[3]);
  const close = readFiniteNumber(row[4]);
  const volume = readFiniteNumber(row[5]);

  return {
    timestamp,
    open,
    high,
    low,
    close,
    volume,
    quoteVolume: close * volume,
  };
}

async function readCachedCandles(cache: CachePort | undefined, key: string) {
  if (cache === undefined) {
    return null;
  }

  const cached = await cache.get(key, { type: "json" }).catch(() => null);

  return isCachedCandlesPayload(cached) ? cached : null;
}

async function writeCachedCandles(
  cache: CachePort | undefined,
  key: string,
  value: CachedCandlesPayload,
) {
  if (cache === undefined) {
    return;
  }

  await cache
    .put(key, JSON.stringify(value), {
      expirationTtl: COINBASE_CANDLES_CACHE_TTL_SECONDS,
    })
    .catch(() => undefined);
}

function isCachedCandlesPayload(value: unknown): value is CachedCandlesPayload {
  return (
    isRecord(value) &&
    typeof value.fetchedAt === "string" &&
    Array.isArray(value.candles) &&
    value.candles.length > 0 &&
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

function readTimestampSeconds(value: unknown) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error("invalid_coinbase_candles_payload");
  }

  return value;
}

function readFiniteNumber(value: unknown) {
  const numericValue = typeof value === "string" ? Number(value) : value;

  if (typeof numericValue !== "number" || !Number.isFinite(numericValue)) {
    throw new Error("invalid_coinbase_candles_payload");
  }

  return numericValue;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
