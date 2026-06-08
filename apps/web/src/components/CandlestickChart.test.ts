import type { CandlestickPoint } from "@crypto-realtime-dashboard/shared-types";
import { describe, expect, test } from "vitest";
import {
  isSameCandleTimeRange,
  resolveCandlestickChartTheme,
  resolveCandleTimeRange,
} from "./CandlestickChart";

describe("resolveCandlestickChartTheme", () => {
  test("lightなら白背景のchart themeを返す", () => {
    expect(resolveCandlestickChartTheme(false)).toEqual({
      background: "#ffffff",
      text: "#475569",
      grid: "#f1f5f9",
      border: "#e2e8f0",
    });
  });

  test("darkなら濃色背景のchart themeを返す", () => {
    expect(resolveCandlestickChartTheme(true)).toEqual({
      background: "#0f172a",
      text: "#cbd5e1",
      grid: "#1e293b",
      border: "#334155",
    });
  });
});

describe("resolveCandleTimeRange", () => {
  test("candlesが空なら表示範囲を返さない", () => {
    expect(resolveCandleTimeRange([])).toBeNull();
  });

  test("candlesがあれば先頭と末尾のtimestampを表示範囲として返す", () => {
    const candles: CandlestickPoint[] = [createCandle(100), createCandle(200), createCandle(300)];

    expect(resolveCandleTimeRange(candles)).toEqual({
      first: 100,
      last: 300,
    });
  });
});

describe("isSameCandleTimeRange", () => {
  test("前回範囲がnullなら同一範囲として扱わない", () => {
    expect(isSameCandleTimeRange(null, { first: 100, last: 200 })).toBe(false);
  });

  test("先頭と末尾のtimestampが同じなら同一範囲として扱う", () => {
    expect(isSameCandleTimeRange({ first: 100, last: 200 }, { first: 100, last: 200 })).toBe(true);
  });

  test("末尾のtimestampが変わったら同一範囲として扱わない", () => {
    expect(isSameCandleTimeRange({ first: 100, last: 200 }, { first: 100, last: 300 })).toBe(false);
  });
});

function createCandle(timestamp: number): CandlestickPoint {
  return {
    timestamp,
    open: 100,
    high: 110,
    low: 90,
    close: 105,
    volume: 1_000,
    quoteVolume: 100_000,
  };
}
