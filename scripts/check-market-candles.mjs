const baseUrl = process.env.BFF_BASE_URL ?? "http://127.0.0.1:8787";
const url = new URL("/api/market/candles", baseUrl);
url.searchParams.set("symbol", process.env.MARKET_CANDLES_SYMBOL ?? "BTC-USD");
url.searchParams.set("interval", process.env.MARKET_CANDLES_INTERVAL ?? "1m");

const response = await fetch(url).catch((error) => {
  console.log(
    JSON.stringify(
      {
        ok: false,
        baseUrl,
        status: 0,
        cache: "none",
        source: "none",
        candleCount: 0,
        errorType: "request_failed",
        errorName: error instanceof Error ? error.name : "unknown",
      },
      null,
      2,
    ),
  );
  process.exit(1);
});
const payload = await response.json().catch(() => null);
const candles = Array.isArray(payload?.data) ? payload.data : [];
const candleCount = candles.length;
const source = typeof payload?.source === "string" ? payload.source : "none";
const timestamps = candles.map((candle) => candle?.timestamp);
const uniqueTimestampCount = new Set(timestamps).size;
const strictlyAscending = timestamps.every(
  (timestamp, index) =>
    typeof timestamp === "number" &&
    Number.isInteger(timestamp) &&
    timestamp >= 0 &&
    (index === 0 || timestamp > timestamps[index - 1]),
);
const validOhlcv = candles.every((candle) => {
  if (typeof candle !== "object" || candle === null) {
    return false;
  }

  const values = [
    candle.open,
    candle.high,
    candle.low,
    candle.close,
    candle.volume,
    candle.quoteVolume,
  ];

  return (
    values.every((value) => typeof value === "number" && Number.isFinite(value)) &&
    candle.open > 0 &&
    candle.high > 0 &&
    candle.low > 0 &&
    candle.close > 0 &&
    candle.volume >= 0 &&
    candle.quoteVolume >= 0 &&
    candle.low <= candle.open &&
    candle.low <= candle.close &&
    candle.high >= candle.open &&
    candle.high >= candle.close
  );
});
const ok =
  response.ok &&
  source === "coinbase" &&
  candleCount === 120 &&
  uniqueTimestampCount === candleCount &&
  strictlyAscending &&
  validOhlcv;
const errorType =
  payload !== null &&
  typeof payload === "object" &&
  "error" in payload &&
  typeof payload.error === "object" &&
  payload.error !== null &&
  "type" in payload.error &&
  typeof payload.error.type === "string"
    ? payload.error.type
    : "none";

console.log(
  JSON.stringify(
    {
      ok,
      baseUrl,
      status: response.status,
      cache: typeof payload?.cache === "string" ? payload.cache : "none",
      source,
      candleCount,
      uniqueTimestampCount,
      strictlyAscending,
      validOhlcv,
      errorType,
    },
    null,
    2,
  ),
);

if (!ok) {
  process.exitCode = 1;
}
