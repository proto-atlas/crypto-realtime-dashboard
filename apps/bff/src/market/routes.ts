import type {
  ApiErrorResponse,
  CandlestickPoint,
  MarketDataResponse,
} from "@crypto-realtime-dashboard/shared-types";
import { Hono } from "hono";
import type { Bindings } from "../bindings";
import { CoinbaseUpstreamHttpError, fetchCoinbaseCandles } from "../coinbase/candles";

export const marketRoutes = new Hono<{ Bindings: Bindings }>();

marketRoutes.get("/candles", async (c) => {
  const symbol = c.req.query("symbol") ?? "";
  const interval = c.req.query("interval") ?? "";

  try {
    const result = await fetchCoinbaseCandles(symbol, interval, {
      cache: c.env?.MARKET_CACHE,
    });
    const response: MarketDataResponse<CandlestickPoint[]> = {
      source: "coinbase",
      cache: result.cache,
      updatedAt: result.fetchedAt,
      data: result.data,
    };

    return c.json(response);
  } catch (error) {
    return handleCandlesError(error, symbol, interval);
  }
});

function handleCandlesError(error: unknown, symbol: string, interval: string) {
  const errorType = error instanceof Error ? error.message : "unknown_error";

  if (errorType === "invalid_market_pair_symbol" || errorType === "invalid_chart_interval") {
    const response: ApiErrorResponse = {
      error: {
        type: "invalid_request",
        message: "ローソク足のリクエストが不正です。",
      },
    };

    return Response.json(response, { status: 400 });
  }

  if (
    error instanceof CoinbaseUpstreamHttpError ||
    errorType === "invalid_coinbase_candles_payload" ||
    errorType === "coinbase_network_error"
  ) {
    return Response.json(createDemoCandlesResponse(symbol, interval));
  }

  const response: ApiErrorResponse = {
    error: {
      type: "upstream_error",
      message: "ローソク足の取得に失敗しました。",
    },
  };

  return Response.json(response, { status: 502 });
}

function createDemoCandlesResponse(
  symbol: string,
  interval: string,
): MarketDataResponse<CandlestickPoint[]> {
  const fetchedAt = new Date().toISOString();
  const basePrice = resolveDemoBasePrice(symbol);
  const intervalMs = resolveDemoIntervalMs(interval);
  const now = Date.now();
  const data = Array.from({ length: 120 }, (_, index) => {
    const timestamp = now - (119 - index) * intervalMs;
    const wave = Math.sin(index / 7) * 0.012;
    const trend = index * 0.00025;
    const open = roundUsd(basePrice * (1 + wave + trend));
    const close = roundUsd(open * (1 + Math.sin(index / 5) * 0.004));
    const high = roundUsd(Math.max(open, close) * 1.006);
    const low = roundUsd(Math.min(open, close) * 0.994);
    const volume = roundUsd(120 + index * 1.8);

    return {
      timestamp,
      open,
      high,
      low,
      close,
      volume,
      quoteVolume: roundUsd(volume * close),
    };
  });

  return {
    source: "demo",
    cache: "bypass",
    updatedAt: fetchedAt,
    data,
  };
}

function resolveDemoIntervalMs(interval: string) {
  switch (interval) {
    case "5m":
      return 5 * 60_000;
    case "15m":
      return 15 * 60_000;
    case "1h":
      return 60 * 60_000;
    case "1d":
      return 24 * 60 * 60_000;
    default:
      return 60_000;
  }
}

function resolveDemoBasePrice(symbol: string) {
  switch (symbol.trim().toUpperCase()) {
    case "ETH-USD":
      return 2200;
    case "SOL-USD":
      return 110;
    case "XRP-USD":
      return 0.62;
    default:
      return 43000;
  }
}

function roundUsd(value: number) {
  return Math.round(value * 100) / 100;
}
