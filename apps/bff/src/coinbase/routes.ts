import type { ApiErrorResponse } from "@crypto-realtime-dashboard/shared-types";
import { Hono } from "hono";
import { isWebSocketUpgrade } from "../binance/stream";
import type { Bindings } from "../bindings";
import { createCoinbaseRelayName, createCoinbaseStreamPath } from "./stream";

export const coinbaseRoutes = new Hono<{ Bindings: Bindings }>();

coinbaseRoutes.get("/ticker", async (c) => {
  if (!isWebSocketUpgrade(c.req.raw)) {
    return new Response("Expected WebSocket upgrade.", { status: 426 });
  }

  const namespace = c.env?.COINBASE_TICKER_RELAY;

  if (namespace === undefined) {
    const response: ApiErrorResponse = {
      error: {
        type: "configuration_error",
        message: "Coinbase ticker relay is not configured.",
      },
    };

    return c.json(response, 503);
  }

  const id = namespace.idFromName(createCoinbaseRelayName());
  const stub = namespace.get(id);
  const relayUrl = new URL(createCoinbaseStreamPath(), c.req.url);

  return stub.fetch(relayUrl, c.req.raw);
});
