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
// 外部API待機でWorkerの応答が止まり続けないよう、取得処理を8秒で打ち切る。
const COINBASE_REQUEST_TIMEOUT_MS = 8_000;
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

  const candles: CandlestickPoint[] = [];
  const timestamps = new Set<number>();

  for (const row of payload) {
    const candle = normalizeCoinbaseCandleRow(row);

    if (timestamps.has(candle.timestamp)) {
      throw new Error("invalid_coinbase_candles_payload");
    }

    timestamps.add(candle.timestamp);
    candles.push(candle);
  }

  candles.sort((left, right) => left.timestamp - right.timestamp);

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
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), COINBASE_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetcher(url.toString(), {
      headers: {
        accept: "application/json",
        "user-agent": COINBASE_USER_AGENT,
      },
      signal: abortController.signal,
    }).catch(() => {
      throw new Error(
        abortController.signal.aborted ? "coinbase_timeout_error" : "coinbase_network_error",
      );
    });

    if (!response.ok) {
      throw new CoinbaseUpstreamHttpError(response.status);
    }

    return response.json().catch(() => {
      throw new Error(
        abortController.signal.aborted
          ? "coinbase_timeout_error"
          : "invalid_coinbase_candles_payload",
      );
    }) as Promise<unknown>;
  } finally {
    clearTimeout(timeoutId);
  }
}

function normalizeCoinbaseCandleRow(row: unknown): CandlestickPoint {
  if (!Array.isArray(row) || row.length < 6) {
    throw new Error("invalid_coinbase_candles_payload");
  }

  const timestamp = readTimestampMilliseconds(row[0]);
  const low = readFiniteNumber(row[1]);
  const high = readFiniteNumber(row[2]);
  const open = readFiniteNumber(row[3]);
  const close = readFiniteNumber(row[4]);
  const volume = readFiniteNumber(row[5]);
  const candle = {
    timestamp,
    open,
    high,
    low,
    close,
    volume,
    quoteVolume: close * volume,
  };

  if (!isCandlestickPoint(candle)) {
    throw new Error("invalid_coinbase_candles_payload");
  }

  return candle;
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
    value.candles.length <= COINBASE_CANDLES_LIMIT &&
    value.candles.every(
      (candle, index, candles) =>
        isCandlestickPoint(candle) &&
        (index === 0 || candle.timestamp > candles[index - 1].timestamp),
    )
  );
}

function isCandlestickPoint(value: unknown): value is CandlestickPoint {
  return (
    isRecord(value) &&
    typeof value.timestamp === "number" &&
    Number.isSafeInteger(value.timestamp) &&
    value.timestamp >= 0 &&
    Number.isFinite(new Date(value.timestamp).getTime()) &&
    typeof value.open === "number" &&
    Number.isFinite(value.open) &&
    value.open > 0 &&
    typeof value.high === "number" &&
    Number.isFinite(value.high) &&
    value.high > 0 &&
    typeof value.low === "number" &&
    Number.isFinite(value.low) &&
    value.low > 0 &&
    typeof value.close === "number" &&
    Number.isFinite(value.close) &&
    value.close > 0 &&
    value.low <= value.open &&
    value.low <= value.close &&
    value.high >= value.open &&
    value.high >= value.close &&
    typeof value.volume === "number" &&
    Number.isFinite(value.volume) &&
    value.volume >= 0 &&
    typeof value.quoteVolume === "number" &&
    Number.isFinite(value.quoteVolume) &&
    value.quoteVolume >= 0 &&
    value.quoteVolume === value.close * value.volume
  );
}

function readTimestampMilliseconds(value: unknown) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new Error("invalid_coinbase_candles_payload");
  }

  const timestamp = value * 1000;

  if (!Number.isSafeInteger(timestamp) || !Number.isFinite(new Date(timestamp).getTime())) {
    throw new Error("invalid_coinbase_candles_payload");
  }

  return timestamp;
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
