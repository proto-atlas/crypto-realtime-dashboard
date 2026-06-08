import { afterEach, describe, expect, test, vi } from "vitest";
import { app } from "../app";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("/api/ws/binance/ticker", () => {
  test("WebSocket upgradeではないrequestなら426を返す", async () => {
    const response = await app.request("/api/ws/binance/ticker");
    const body = await response.text();

    expect(response.status).toBe(426);
    expect(body).toBe("Expected WebSocket upgrade.");
  });

  test("Durable Object bindingが未設定なら503を返す", async () => {
    const response = await app.request("/api/ws/binance/ticker", {
      headers: {
        Upgrade: "websocket",
      },
    });
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({
      error: {
        type: "configuration_error",
        message: "Binance ticker relay is not configured.",
      },
    });
  });
});

describe("/api/binance/klines", () => {
  test("未対応のsymbolなら400を返す", async () => {
    const response = await app.request("/api/binance/klines?symbol=DOGEUSDT&interval=1m");
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      error: {
        type: "invalid_request",
        message: "Binance kline request is invalid.",
      },
    });
  });

  test("未対応のintervalなら400を返す", async () => {
    const response = await app.request("/api/binance/klines?symbol=BTCUSDT&interval=2m");
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      error: {
        type: "invalid_request",
        message: "Binance kline request is invalid.",
      },
    });
  });

  test("上流fetchに失敗したら502のnetwork errorを返す", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new Error("fetch failed");
    });

    const response = await app.request("/api/binance/klines?symbol=BTCUSDT&interval=1m");
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body).toEqual({
      error: {
        type: "upstream_network_error",
        message: "Binance kline upstream could not be reached.",
      },
    });
  });

  test("上流HTTP statusが失敗なら502のstatus errorを返す", async () => {
    vi.stubGlobal("fetch", async () => new Response(null, { status: 451 }));

    const response = await app.request("/api/binance/klines?symbol=BTCUSDT&interval=1m");
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body).toEqual({
      error: {
        type: "upstream_http_error",
        message: "Binance kline upstream returned an error status.",
        upstreamStatus: 451,
      },
    });
  });
});
