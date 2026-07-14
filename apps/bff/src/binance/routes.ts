import type { ApiErrorResponse } from "@crypto-realtime-dashboard/shared-types";
import { Hono } from "hono";
import type { Bindings } from "../bindings";
import { createBinanceRelayName, createBinanceStreamPath, isWebSocketUpgrade } from "./stream";

export const binanceWebSocketRoutes = new Hono<{ Bindings: Bindings }>();

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
