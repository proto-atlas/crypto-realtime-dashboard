import { describe, expect, test } from "vitest";
import { applyLivePriceToLastCandle, toLightweightCandles } from "./candlestick";

const candles = [
  {
    timestamp: 1767225600000,
    open: 100,
    high: 110,
    low: 90,
    close: 105,
    volume: 12,
    quoteVolume: 1260,
  },
  {
    timestamp: 1767225660000,
    open: 105,
    high: 108,
    low: 102,
    close: 106,
    volume: 10,
    quoteVolume: 1060,
  },
];

describe("toLightweightCandles", () => {
  test("ミリ秒timestampを秒timestampへ変換してOHLCだけを返す", () => {
    expect(toLightweightCandles(candles)).toEqual([
      {
        time: 1767225600,
        open: 100,
        high: 110,
        low: 90,
        close: 105,
      },
      {
        time: 1767225660,
        open: 105,
        high: 108,
        low: 102,
        close: 106,
      },
    ]);
  });
});

describe("applyLivePriceToLastCandle", () => {
  test("最新価格が高値より上なら最後の足のhighとcloseを更新する", () => {
    expect(applyLivePriceToLastCandle(candles, 120)[1]).toEqual({
      timestamp: 1767225660000,
      open: 105,
      high: 120,
      low: 102,
      close: 120,
      volume: 10,
      quoteVolume: 1060,
    });
  });

  test("最新価格がnullなら元配列と同じ内容を返す", () => {
    expect(applyLivePriceToLastCandle(candles, null)).toEqual(candles);
  });
});
