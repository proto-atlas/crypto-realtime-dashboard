const baseUrl = process.env.BFF_BASE_URL ?? "http://127.0.0.1:8787";

const checks = [
  {
    name: "markets",
    path: "/api/coingecko/coins/markets",
    validate: (payload) => Array.isArray(payload.data) && payload.data.length > 0,
  },
  {
    name: "bitcoin-market-chart",
    path: "/api/coingecko/coins/bitcoin/market_chart",
    validate: (payload) => Array.isArray(payload.data?.prices) && payload.data.prices.length > 0,
  },
];

const results = [];

for (const check of checks) {
  const response = await fetch(new URL(check.path, baseUrl)).catch((error) => {
    results.push({
      name: check.name,
      status: 0,
      ok: false,
      cache: "none",
      source: "none",
      errorType: "request_failed",
      errorName: error instanceof Error ? error.name : "unknown",
    });

    return null;
  });

  if (response === null) {
    continue;
  }

  const payload = await response.json().catch(() => null);
  const ok = response.ok && check.validate(payload);
  const upstreamErrorType =
    payload !== null &&
    typeof payload === "object" &&
    "error" in payload &&
    isErrorPayload(payload.error)
      ? payload.error.type
      : "none";

  results.push({
    name: check.name,
    status: response.status,
    ok,
    cache: isRecord(payload) && typeof payload.cache === "string" ? payload.cache : "none",
    source: isRecord(payload) && typeof payload.source === "string" ? payload.source : "none",
    errorType: upstreamErrorType,
  });
}

const failed = results.filter((result) => !result.ok);

console.log(JSON.stringify({ ok: failed.length === 0, baseUrl, results }, null, 2));

if (failed.length > 0) {
  process.exitCode = 1;
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isErrorPayload(value) {
  return isRecord(value) && typeof value.type === "string";
}
