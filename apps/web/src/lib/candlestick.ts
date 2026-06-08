import type { CandlestickPoint } from "@crypto-realtime-dashboard/shared-types";
import type { CandlestickData, UTCTimestamp } from "lightweight-charts";

export function toLightweightCandles(candles: readonly CandlestickPoint[]) {
  return candles.map((candle) => ({
    time: toUtcTimestamp(candle.timestamp),
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
  })) satisfies CandlestickData<UTCTimestamp>[];
}

export function applyLivePriceToLastCandle(
  candles: readonly CandlestickPoint[],
  latestPrice: number | null,
) {
  if (latestPrice === null || candles.length === 0) {
    return [...candles];
  }

  const nextCandles = candles.map((candle) => ({ ...candle }));
  const lastIndex = nextCandles.length - 1;
  const lastCandle = nextCandles[lastIndex];

  nextCandles[lastIndex] = {
    ...lastCandle,
    high: Math.max(lastCandle.high, latestPrice),
    low: Math.min(lastCandle.low, latestPrice),
    close: latestPrice,
  };

  return nextCandles;
}

function toUtcTimestamp(timestampMs: number) {
  return Math.floor(timestampMs / 1000) as UTCTimestamp;
}
