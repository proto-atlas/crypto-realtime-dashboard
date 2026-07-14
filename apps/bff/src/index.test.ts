import { describe, expect, test } from "vitest";
import { app, resolveCorsOrigin } from "./app";

describe("BFF案内ルート", () => {
  test("ルートURLをGETで呼び出したら案内JSONを返す", async () => {
    const response = await app.request("/");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      service: "crypto-realtime-dashboard-bff",
      message:
        "Crypto Real-time DashboardのBFFです。health checkは /api/healthを参照してください。",
      webUi: "https://crypto-realtime-dashboard.pages.dev",
      endpoints: {
        health: "/api/health",
        coingeckoMarkets: "/api/coingecko/coins/markets",
        marketCandles: "/api/market/candles",
        binanceTickerWs: "/api/ws/binance/ticker",
        coinbaseTickerWs: "/api/ws/coinbase/ticker",
      },
    });
  });
});

describe("/api/health", () => {
  test("GETで呼び出したら200を返す", async () => {
    const response = await app.request("/api/health");

    expect(response.status).toBe(200);
  });

  test("GETで呼び出したらBFFの状態をJSONで返す", async () => {
    const response = await app.request("/api/health");
    const body = await response.json();

    expect(body).toEqual({
      ok: true,
      service: "crypto-realtime-dashboard-bff",
      mode: "demo",
      timestamp: expect.any(String),
    });
  });

  test("/healthをGETで呼び出したら/api/healthと同じ形式のJSONを返す", async () => {
    const response = await app.request("/health");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      service: "crypto-realtime-dashboard-bff",
      mode: "demo",
      timestamp: expect.any(String),
    });
  });

  test("Pages preview originから呼び出したらCORS headerを返す", async () => {
    const response = await app.request("/api/health", {
      headers: {
        origin: "https://b8e00e4a.crypto-realtime-dashboard.pages.dev",
      },
    });

    expect(response.headers.get("access-control-allow-origin")).toBe(
      "https://b8e00e4a.crypto-realtime-dashboard.pages.dev",
    );
  });
});

describe("resolveCorsOrigin", () => {
  test("production Pages originを渡したら同じoriginを返す", () => {
    expect(resolveCorsOrigin("https://crypto-realtime-dashboard.pages.dev")).toBe(
      "https://crypto-realtime-dashboard.pages.dev",
    );
  });

  test("許可していないoriginを渡したらproduction Pages originを返す", () => {
    expect(resolveCorsOrigin("https://example.test")).toBe(
      "https://crypto-realtime-dashboard.pages.dev",
    );
  });
});
