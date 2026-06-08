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
  try {
    const result = await fetchBinanceKlines(
      c.req.query("symbol") ?? "",
      c.req.query("interval") ?? "",
      {
        cache: c.env?.MARKET_CACHE,
      },
    );
    const response: MarketDataResponse<CandlestickPoint[]> = {
      source: "binance",
      cache: result.cache,
      updatedAt: result.fetchedAt,
      data: result.data,
    };

    return c.json(response);
  } catch (error) {
    return handleBinanceKlinesError(error);
  }
});

function handleBinanceKlinesError(error: unknown) {
  const upstreamStatus = readBinanceUpstreamStatus(error);

  if (upstreamStatus !== null) {
    const response: ApiErrorResponse = {
      error: {
        type: "upstream_http_error",
        message: "Binance kline upstream returned an error status.",
        upstreamStatus,
      },
    };

    return Response.json(response, { status: 502 });
  }

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

  if (errorType === "invalid_binance_klines_payload") {
    const response: ApiErrorResponse = {
      error: {
        type: "invalid_upstream_payload",
        message: "Binance kline payload could not be normalized.",
      },
    };

    return Response.json(response, { status: 502 });
  }

  if (errorType === "binance_network_error") {
    const response: ApiErrorResponse = {
      error: {
        type: "upstream_network_error",
        message: "Binance kline upstream could not be reached.",
      },
    };

    return Response.json(response, { status: 502 });
  }

  const response: ApiErrorResponse = {
    error: {
      type: "upstream_error",
      message: "Binance kline request failed.",
    },
  };

  return Response.json(response, { status: 502 });
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
