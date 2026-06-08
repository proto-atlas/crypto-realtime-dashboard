import { describe, expect, test } from "vitest";
import {
  createBinanceRelayName,
  createBinanceStatusMessage,
  createBinanceStreamPath,
  isWebSocketUpgrade,
} from "./stream";

describe("isWebSocketUpgrade", () => {
  test("Upgradeヘッダーがwebsocketならtrueを返す", () => {
    const request = new Request("http://localhost/api/ws/binance/ticker", {
      headers: {
        Upgrade: "websocket",
      },
    });

    expect(isWebSocketUpgrade(request)).toBe(true);
  });

  test("Upgradeヘッダーがなければfalseを返す", () => {
    const request = new Request("http://localhost/api/ws/binance/ticker");

    expect(isWebSocketUpgrade(request)).toBe(false);
  });
});

describe("createBinanceRelayName", () => {
  test("固定のDurable Object名を返す", () => {
    expect(createBinanceRelayName()).toBe("all-market-mini-ticker");
  });
});

describe("createBinanceStreamPath", () => {
  test("Binance relay用のAPI pathを返す", () => {
    expect(createBinanceStreamPath()).toBe("/api/ws/binance/ticker");
  });
});

describe("createBinanceStatusMessage", () => {
  test("relay状態をJSON文字列で返す", () => {
    expect(JSON.parse(createBinanceStatusMessage("connected"))).toEqual({
      type: "binance_relay_status",
      status: "connected",
      stream: "!miniTicker@arr",
    });
  });
});
