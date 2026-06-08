import { describe, expect, test } from "vitest";
import { createDemoCandlesticks, createDemoMarketChart, createDemoTickers } from "./demoMarketData";

describe("createDemoTickers", () => {
  test("呼び出したら4つのデモ銘柄を返す", () => {
    expect(createDemoTickers()).toHaveLength(4);
  });

  test("呼び出したらBTCを先頭に返す", () => {
    expect(createDemoTickers()[0]).toEqual({
      symbol: "BTC",
      displayName: "Bitcoin",
      priceUsd: 43120.52,
      change24hPercent: 1.24,
      volume24hUsd: 18_240_000_000,
      updatedAt: "demo",
    });
  });
});

describe("createDemoMarketChart", () => {
  test("BTCと3件を渡したら決定的なprice系列を返す", () => {
    expect(createDemoMarketChart("BTC", 3).prices).toEqual([
      { timestamp: 1767225600000, value: 42785 },
      { timestamp: 1767229200000, value: 42935.5 },
      { timestamp: 1767232800000, value: 43086 },
    ]);
  });

  test("0件を渡したら例外を投げる", () => {
    expect(() => createDemoMarketChart("BTC", 0)).toThrow("invalid_demo_chart_point_count");
  });
});

describe("createDemoCandlesticks", () => {
  test("BTCと2件を渡したら決定的なローソク足を返す", () => {
    expect(createDemoCandlesticks("BTC", 2)).toEqual([
      {
        timestamp: 1767225600000,
        open: 42699.43,
        high: 42913.36,
        low: 42571.08,
        close: 42785,
        volume: 420708.19,
        quoteVolume: 18000000000,
      },
      {
        timestamp: 1767229200000,
        open: 42785,
        high: 43064.31,
        low: 42656.19,
        close: 42935.5,
        volume: 425522,
        quoteVolume: 18270000000,
      },
    ]);
  });
});
