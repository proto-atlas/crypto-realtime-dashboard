import type { HealthResponse } from "@crypto-realtime-dashboard/shared-types";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { binanceRestRoutes, binanceWebSocketRoutes } from "./binance/routes";
import type { Bindings } from "./bindings";
import { coinbaseRoutes } from "./coinbase/routes";
import { coingeckoRoutes } from "./coingecko/routes";
import { enforceCoinGeckoRateLimit } from "./rate-limit";

const productionPagesOrigin = "https://crypto-realtime-dashboard.pages.dev";
const localDevOrigins = new Set(["http://localhost:5173", "http://127.0.0.1:5173"]);
const serviceName = "crypto-realtime-dashboard-bff";

const app = new Hono<{ Bindings: Bindings }>();

app.use(
  "/api/*",
  cors({
    origin: resolveCorsOrigin,
    allowMethods: ["GET", "OPTIONS"],
    maxAge: 600,
  }),
);

app.use("/api/coingecko/*", enforceCoinGeckoRateLimit);

app.get("/", (c) =>
  c.json({
    ok: true,
    service: serviceName,
    message: "Crypto Real-time DashboardのBFFです。health checkは /api/healthを参照してください。",
    webUi: productionPagesOrigin,
    endpoints: {
      health: "/api/health",
      coingeckoMarkets: "/api/coingecko/coins/markets",
      binanceKlines: "/api/binance/klines",
      binanceTickerWs: "/api/ws/binance/ticker",
      coinbaseTickerWs: "/api/ws/coinbase/ticker",
    },
  }),
);

app.get("/health", (c) => c.json(createHealthResponse()));
app.get("/api/health", (c) => c.json(createHealthResponse()));

app.route("/api/coingecko", coingeckoRoutes);
app.route("/api/ws/binance", binanceWebSocketRoutes);
app.route("/api/binance", binanceRestRoutes);
app.route("/api/ws/coinbase", coinbaseRoutes);

export { app };

export function resolveCorsOrigin(origin: string) {
  if (
    origin === productionPagesOrigin ||
    origin.endsWith(".crypto-realtime-dashboard.pages.dev") ||
    localDevOrigins.has(origin)
  ) {
    return origin;
  }

  return productionPagesOrigin;
}

function createHealthResponse(): HealthResponse {
  return {
    ok: true,
    service: serviceName,
    mode: "demo",
    timestamp: new Date().toISOString(),
  };
}
