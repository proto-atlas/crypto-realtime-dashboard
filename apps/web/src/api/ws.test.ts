import { describe, expect, test } from "vitest";
import { createBinanceTickerWebSocketUrl, createCoinbaseTickerWebSocketUrl } from "./ws";

describe("createBinanceTickerWebSocketUrl", () => {
  test("httpsのlocationを渡したらwss URLを返す", () => {
    expect(
      createBinanceTickerWebSocketUrl({
        protocol: "https:",
        host: "example.test",
      }),
    ).toBe("wss://example.test/api/ws/binance/ticker");
  });

  test("httpのlocationを渡したらws URLを返す", () => {
    expect(
      createBinanceTickerWebSocketUrl({
        protocol: "http:",
        host: "localhost:5173",
      }),
    ).toBe("ws://localhost:5173/api/ws/binance/ticker");
  });

  test("BFF originを渡したらBFF originのwss URLを返す", () => {
    expect(
      createBinanceTickerWebSocketUrl(
        {
          protocol: "https:",
          host: "pages.example.test",
        },
        "https://bff.example.test/",
      ),
    ).toBe("wss://bff.example.test/api/ws/binance/ticker");
  });
});

describe("createCoinbaseTickerWebSocketUrl", () => {
  test("httpsのlocationを渡したらwss URLを返す", () => {
    expect(
      createCoinbaseTickerWebSocketUrl({
        protocol: "https:",
        host: "example.test",
      }),
    ).toBe("wss://example.test/api/ws/coinbase/ticker");
  });

  test("httpのlocationを渡したらws URLを返す", () => {
    expect(
      createCoinbaseTickerWebSocketUrl({
        protocol: "http:",
        host: "localhost:5173",
      }),
    ).toBe("ws://localhost:5173/api/ws/coinbase/ticker");
  });

  test("BFF originを渡したらBFF originのwss URLを返す", () => {
    expect(
      createCoinbaseTickerWebSocketUrl(
        {
          protocol: "https:",
          host: "pages.example.test",
        },
        "https://bff.example.test/",
      ),
    ).toBe("wss://bff.example.test/api/ws/coinbase/ticker");
  });
});
