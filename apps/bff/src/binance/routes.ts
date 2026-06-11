import type {
  ApiErrorResponse,
  CandlestickPoint,
  MarketDataResponse,
} from "@crypto-realtime-dashboard/shared-types";
import { Hono } from "hono";
import type { Bindings } from "../bindings";
import { BinanceUpstreamHttpError, fetchBinanceKlines } from "./klines";
import { createBinanceRelayName, createBinanceStreamPath, isWebSocketUpgrade } from "./stream";

export const binanceWebSocketRoutes = new Hono<{ Bindings: Bindings }>();
export const binanceRestRoutes = new Hono<{ Bindings: Bindings }>();

binanceWebSocketRoutes.get("/ticker", async (c) => {
  if (!isWebSocketUpgrade(c.req.raw)) {
    return new Response("Expected WebSocket upgrade.", { status: 426 });
  }

  const namespace = c.env?.BINANCE_TICKER_RELAY;

  if (namespace === undefined) {
    const response: ApiErrorResponse = {
      error: {
        type: "configuration_error",
        message: "Binance ticker relay is not configured.",
      },
    };

    return c.json(response, 503);
  }

  const id = namespace.idFromName(createBinanceRelayName());
  const stub = namespace.get(id);
  const relayUrl = new URL(createBinanceStreamPath(), c.req.url);

  return stub.fetch(relayUrl, c.req.raw);
});

binanceRestRoutes.get("/klines", async (c) => {
  const symbol = c.req.query("symbol") ?? "";
  const interval = c.req.query("interval") ?? "";

  try {
    const result = await fetchBinanceKlines(symbol, interval, {
      cache: c.env?.MARKET_CACHE,
    });
    const response: MarketDataResponse<CandlestickPoint[]> = {
      source: "binance",
      cache: result.cache,
      updatedAt: result.fetchedAt,
      data: result.data,
    };

    return c.json(response);
  } catch (error) {
    return handleBinanceKlinesError(error, symbol);
  }
});

function handleBinanceKlinesError(error: unknown, symbol: string) {
  const upstreamStatus = readBinanceUpstreamStatus(error);
  const errorType = error instanceof Error ? error.message : "unknown_error";

  if (errorType === "invalid_binance_symbol" || errorType === "invalid_binance_interval") {
    const response: ApiErrorResponse = {
      error: {
        type: "invalid_request",
        message: "Binance kline request is invalid.",
      },
    };

    return Response.json(response, { status: 400 });
  }

  if (
    upstreamStatus !== null ||
    errorType === "invalid_binance_klines_payload" ||
    errorType === "binance_network_error"
  ) {
    return Response.json(createDemoKlinesResponse(symbol));
  }

  const response: ApiErrorResponse = {
    error: {
      type: "upstream_error",
      message: "Binance kline request failed.",
    },
  };

  return Response.json(response, { status: 502 });
}

function createDemoKlinesResponse(symbol: string): MarketDataResponse<CandlestickPoint[]> {
  const fetchedAt = new Date().toISOString();
  const basePrice = resolveDemoBasePrice(symbol);
  const now = Date.now();
  const data = Array.from({ length: 120 }, (_, index) => {
    const timestamp = now - (119 - index) * 60_000;
    const wave = Math.sin(index / 7) * 0.012;
    const trend = index * 0.00025;
    const open = roundUsd(basePrice * (1 + wave + trend));
    const close = roundUsd(open * (1 + Math.sin(index / 5) * 0.004));
    const high = roundUsd(Math.max(open, close) * 1.006);
    const low = roundUsd(Math.min(open, close) * 0.994);

    return {
      timestamp,
      open,
      high,
      low,
      close,
      volume: roundUsd(120 + index * 1.8),
      quoteVolume: roundUsd((120 + index * 1.8) * close),
    };
  });

  return {
    source: "demo",
    cache: "bypass",
    updatedAt: fetchedAt,
    data,
  };
}

function resolveDemoBasePrice(symbol: string) {
  switch (symbol.trim().toUpperCase()) {
    case "ETHUSDT":
      return 2200;
    case "SOLUSDT":
      return 110;
    case "XRPUSDT":
      return 0.62;
    default:
      return 43000;
  }
}

function roundUsd(value: number) {
  return Math.round(value * 100) / 100;
}

function readBinanceUpstreamStatus(error: unknown) {
  if (
    error instanceof BinanceUpstreamHttpError &&
    Number.isInteger(error.statusCode) &&
    error.statusCode > 0
  ) {
    return error.statusCode;
  }

  if (!isRecord(error)) {
    return null;
  }

  return error.message === "binance_upstream_http_error" &&
    typeof error.statusCode === "number" &&
    Number.isInteger(error.statusCode) &&
    error.statusCode > 0
    ? error.statusCode
    : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
