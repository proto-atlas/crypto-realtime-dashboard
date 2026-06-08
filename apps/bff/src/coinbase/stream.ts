export const COINBASE_MARKET_STREAM_URL = "wss://ws-feed.exchange.coinbase.com";

const STREAM_PATH = "/api/ws/coinbase/ticker";
const PRODUCT_IDS = ["BTC-USD", "ETH-USD", "SOL-USD", "XRP-USD"] as const;

export function createCoinbaseRelayName() {
  return "coinbase-ticker-batch";
}

export function createCoinbaseStreamPath() {
  return STREAM_PATH;
}

export function createCoinbaseSubscribeMessage() {
  // 公式docsのticker_batch channel仕様に合わせて、Coinbase Exchange WebSocket feedを購読する。
  return JSON.stringify({
    type: "subscribe",
    product_ids: PRODUCT_IDS,
    channels: ["ticker_batch"],
  });
}

export function createCoinbaseStatusMessage(
  status: "connected" | "upstream_open" | "subscribed" | "upstream_closed",
) {
  return JSON.stringify({
    type: "coinbase_relay_status",
    status,
    channel: "ticker_batch",
  });
}
