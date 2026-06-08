const baseUrl = process.env.BFF_BASE_URL ?? "http://127.0.0.1:8787";
const url = new URL("/api/binance/klines", baseUrl);
url.searchParams.set("symbol", process.env.BINANCE_KLINES_SYMBOL ?? "BTCUSDT");
url.searchParams.set("interval", process.env.BINANCE_KLINES_INTERVAL ?? "1m");

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
const candleCount = Array.isArray(payload?.data) ? payload.data.length : 0;
const ok = response.ok && candleCount > 0;
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
      source: typeof payload?.source === "string" ? payload.source : "none",
      candleCount,
      errorType,
    },
    null,
    2,
  ),
);

if (!ok) {
  process.exitCode = 1;
}
