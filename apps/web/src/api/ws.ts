import { getBffOrigin, normalizeBffOrigin } from "./config";

export type WebSocketLocationParts = {
  protocol: string;
  host: string;
};

export function createBinanceTickerWebSocketUrl(
  location: WebSocketLocationParts,
  bffOrigin = getBffOrigin(),
) {
  return createTickerWebSocketUrl(location, "/api/ws/binance/ticker", bffOrigin);
}

export function createCoinbaseTickerWebSocketUrl(
  location: WebSocketLocationParts,
  bffOrigin = getBffOrigin(),
) {
  return createTickerWebSocketUrl(location, "/api/ws/coinbase/ticker", bffOrigin);
}

function createTickerWebSocketUrl(
  location: WebSocketLocationParts,
  path: string,
  bffOrigin: string,
) {
  const origin = normalizeBffOrigin(bffOrigin);

  if (origin !== "") {
    return `${createWebSocketOrigin(origin)}${path}`;
  }

  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${location.host}${path}`;
}

function createWebSocketOrigin(origin: string) {
  const url = new URL(origin);
  const protocol = url.protocol === "https:" ? "wss:" : "ws:";

  return `${protocol}//${url.host}`;
}
