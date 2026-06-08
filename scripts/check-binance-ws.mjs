const baseUrl = new URL(process.env.BFF_BASE_URL ?? "http://127.0.0.1:8787");
baseUrl.pathname = "/api/ws/binance/ticker";
baseUrl.search = "";
baseUrl.protocol = baseUrl.protocol === "https:" ? "wss:" : "ws:";

const url = process.env.BFF_BINANCE_WS_URL ?? baseUrl.toString();
const timeoutMs = Number(process.env.BINANCE_WS_CHECK_TIMEOUT_MS ?? "15000");
const startedAt = Date.now();

const result = {
  ok: false,
  url,
  statusEvents: [],
  marketPayloadCount: 0,
  firstMarketPayloadSize: 0,
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

  if (Array.isArray(parsed)) {
    result.marketPayloadCount += 1;
    result.firstMarketPayloadSize = result.firstMarketPayloadSize || parsed.length;
    socket.close(1000, "Connection check completed.");
    finish(true);
  }
});

socket.addEventListener("error", () => {
  finish(false, "websocket_error");
});

socket.addEventListener("close", () => {
  if (!result.ok && result.marketPayloadCount === 0) {
    finish(false, "closed_before_market_payload");
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
    value.type === "binance_relay_status" &&
    typeof value.status === "string"
  );
}
