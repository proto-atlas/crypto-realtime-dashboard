const baseUrl = new URL(process.env.BFF_BASE_URL ?? "http://127.0.0.1:8787");
baseUrl.pathname = "/api/ws/coinbase/ticker";
baseUrl.search = "";
baseUrl.protocol = baseUrl.protocol === "https:" ? "wss:" : "ws:";

const url = process.env.BFF_COINBASE_WS_URL ?? baseUrl.toString();
const timeoutMs = Number(process.env.COINBASE_WS_CHECK_TIMEOUT_MS ?? "30000");
const startedAt = Date.now();

const result = {
  ok: false,
  url,
  statusEvents: [],
  subscriptionMessageCount: 0,
  tickerMessageCount: 0,
  firstTickerProductId: null,
  durationMs: 0,
};

if (typeof WebSocket === "undefined") {
  console.log(
    JSON.stringify(
      {
        ...result,
        error: "websocket_not_available",
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

const socket = new WebSocket(url);

const timeout = setTimeout(() => {
  socket.close(1000, "Connection check timeout.");
  finish(false, "timeout");
}, timeoutMs);

socket.addEventListener("message", (event) => {
  if (typeof event.data !== "string") {
    return;
  }

  const parsed = parseJson(event.data);

  if (isRelayStatus(parsed)) {
    result.statusEvents.push(parsed.status);
    return;
  }

  if (isSubscriptionsMessage(parsed)) {
    result.subscriptionMessageCount += 1;
    return;
  }

  if (isTickerMessage(parsed)) {
    result.tickerMessageCount += 1;
    result.firstTickerProductId = result.firstTickerProductId ?? parsed.product_id;
    socket.close(1000, "Connection check completed.");
    finish(true);
  }
});

socket.addEventListener("error", () => {
  finish(false, "websocket_error");
});

socket.addEventListener("close", () => {
  if (!result.ok && result.tickerMessageCount === 0) {
    finish(false, "closed_before_ticker_message");
  }
});

function finish(ok, error) {
  if (result.durationMs > 0) {
    return;
  }

  clearTimeout(timeout);
  result.ok = ok;
  result.durationMs = Date.now() - startedAt;

  const output = error === undefined ? result : { ...result, error };
  console.log(JSON.stringify(output, null, 2));

  if (!ok) {
    process.exitCode = 1;
  }
}

function parseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function isRelayStatus(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    value.type === "coinbase_relay_status" &&
    typeof value.status === "string"
  );
}

function isSubscriptionsMessage(value) {
  return value !== null && typeof value === "object" && value.type === "subscriptions";
}

function isTickerMessage(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    value.type === "ticker" &&
    typeof value.product_id === "string" &&
    typeof value.price === "string"
  );
}
