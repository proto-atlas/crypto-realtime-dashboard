export const BINANCE_MARKET_STREAM_URL = "wss://data-stream.binance.vision/ws/!miniTicker@arr";

const STREAM_PATH = "/api/ws/binance/ticker";

export function isWebSocketUpgrade(request: Request) {
  return request.headers.get("Upgrade")?.toLowerCase() === "websocket";
}

export function createBinanceRelayName() {
  return "all-market-mini-ticker";
}

export function createBinanceStreamPath() {
  return STREAM_PATH;
}

export function createBinanceStatusMessage(
  status: "connected" | "upstream_open" | "upstream_closed",
) {
  return JSON.stringify({
    type: "binance_relay_status",
    status,
    stream: "!miniTicker@arr",
  });
}
