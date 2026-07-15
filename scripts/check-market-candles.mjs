import { validateMarketCandlesResponse } from "./market-candles-validation.mjs";

const baseUrl = process.env.BFF_BASE_URL ?? "http://127.0.0.1:8787";
const interval = process.env.MARKET_CANDLES_INTERVAL ?? "1m";
const url = new URL("/api/market/candles", baseUrl);
url.searchParams.set("symbol", process.env.MARKET_CANDLES_SYMBOL ?? "BTC-USD");
url.searchParams.set("interval", interval);

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
const validation = validateMarketCandlesResponse(response.ok, payload, interval);
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
      ...validation,
      baseUrl,
      status: response.status,
      cache: typeof payload?.cache === "string" ? payload.cache : "none",
      interval,
      errorType,
    },
    null,
    2,
  ),
);

if (!validation.ok) {
  process.exitCode = 1;
}
