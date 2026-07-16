import { validateDurationResult } from "./websocket-duration-validation.mjs";

const baseUrl = new URL(process.env.BFF_BASE_URL ?? "http://127.0.0.1:8787");
const observationMs = Number(process.env.WEBSOCKET_DURATION_MS ?? "300000");

if (!Number.isFinite(observationMs) || observationMs <= 0) {
  console.error("WEBSOCKET_DURATION_MSには正の数を指定してください。");
  process.exit(1);
}

if (typeof WebSocket === "undefined") {
  console.error("このNode.js環境ではWebSocketを利用できません。");
  process.exit(1);
}

const endpoints = [
  createEndpoint("coinbase", "/api/ws/coinbase/ticker", isCoinbaseMarketMessage),
  createEndpoint("binance", "/api/ws/binance/ticker", Array.isArray),
];

const startedAt = Date.now();
const observations = await Promise.all(endpoints.map(observeEndpoint));
const durationMs = Date.now() - startedAt;
const results = observations.map((observation) => ({
  ...observation,
  validation: validateDurationResult(observation),
}));
const ok = results.every((result) => result.validation.ok);

console.log(JSON.stringify({ ok, observationMs, durationMs, results }, null, 2));
if (!ok) {
  process.exitCode = 1;
}

function createEndpoint(name, pathname, isMarketMessage) {
  const url = new URL(baseUrl);
  url.pathname = pathname;
  url.search = "";
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return { name, url: url.toString(), isMarketMessage };
}

function observeEndpoint(endpoint) {
  return new Promise((resolve) => {
    const result = {
      name: endpoint.name,
      url: endpoint.url,
      error: null,
      closedEarly: false,
      messageCount: 0,
      statusEvents: [],
    };
    const socket = new WebSocket(endpoint.url);
    let completed = false;

    const finish = () => {
      if (completed) {
        return;
      }
      completed = true;
      clearTimeout(timer);
      if (socket.readyState === WebSocket.OPEN) {
        socket.close(1000, "Observation completed.");
      }
      resolve(result);
    };

    const timer = setTimeout(finish, observationMs);

    socket.addEventListener("message", (event) => {
      if (typeof event.data !== "string") {
        return;
      }
      const parsed = parseJson(event.data);
      if (isRelayStatus(parsed)) {
        result.statusEvents.push(parsed.status);
      } else if (endpoint.isMarketMessage(parsed)) {
        result.messageCount += 1;
      }
    });

    socket.addEventListener("error", () => {
      result.error = "websocket_error";
      finish();
    });

    socket.addEventListener("close", () => {
      if (!completed) {
        result.closedEarly = true;
        finish();
      }
    });
  });
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
    typeof value.type === "string" &&
    value.type.endsWith("_relay_status") &&
    typeof value.status === "string"
  );
}

function isCoinbaseMarketMessage(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    value.type === "ticker" &&
    typeof value.product_id === "string" &&
    typeof value.price === "string"
  );
}
