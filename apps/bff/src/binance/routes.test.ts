import { describe, expect, test } from "vitest";
import { app } from "../app";

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
    const body = (await response.json()) as { cache: string; data: unknown[]; source: string };

    expect(response.status).toBe(503);
    expect(body).toEqual({
      error: {
        type: "configuration_error",
        message: "Binance ticker relay is not configured.",
      },
    });
  });
});
