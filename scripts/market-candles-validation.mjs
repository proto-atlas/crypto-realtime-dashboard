const intervalMilliseconds = {
  "1m": 60_000,
  "5m": 300_000,
  "15m": 900_000,
  "1h": 3_600_000,
  "1d": 86_400_000,
};

export function validateMarketCandlesResponse(responseOk, payload, interval) {
  const candles = Array.isArray(payload?.data) ? payload.data : [];
  const candleCount = candles.length;
  const source = typeof payload?.source === "string" ? payload.source : "none";
  const timestamps = candles.map((candle) => candle?.timestamp);
  const uniqueTimestampCount = new Set(timestamps).size;
  const strictlyAscending = timestamps.every(
    (timestamp, index) =>
      typeof timestamp === "number" &&
      Number.isSafeInteger(timestamp) &&
      timestamp >= 0 &&
      (index === 0 || timestamp > timestamps[index - 1]),
  );
  const validTimestampSpacing = hasValidTimestampSpacing(timestamps, interval);
  const validOhlcv = candles.every(isValidCandle);
  const ok =
    responseOk &&
    source === "coinbase" &&
    candleCount === 120 &&
    uniqueTimestampCount === candleCount &&
    strictlyAscending &&
    validTimestampSpacing &&
    validOhlcv;

  return {
    ok,
    source,
    candleCount,
    uniqueTimestampCount,
    strictlyAscending,
    validTimestampSpacing,
    validOhlcv,
  };
}

function hasValidTimestampSpacing(timestamps, interval) {
  const intervalMs = intervalMilliseconds[interval];

  if (intervalMs === undefined) {
    return false;
  }

  return timestamps.every((timestamp, index) => {
    if (index === 0) {
      return typeof timestamp === "number" && Number.isSafeInteger(timestamp);
    }

    const previousTimestamp = timestamps[index - 1];

    if (typeof timestamp !== "number" || typeof previousTimestamp !== "number") {
      return false;
    }

    const difference = timestamp - previousTimestamp;
    return difference > 0 && difference % intervalMs === 0;
  });
}

function isValidCandle(candle) {
  if (typeof candle !== "object" || candle === null) {
    return false;
  }

  const values = [
    candle.open,
    candle.high,
    candle.low,
    candle.close,
    candle.volume,
    candle.quoteVolume,
  ];

  return (
    values.every((value) => typeof value === "number" && Number.isFinite(value)) &&
    candle.open > 0 &&
    candle.high > 0 &&
    candle.low > 0 &&
    candle.close > 0 &&
    candle.volume >= 0 &&
    candle.quoteVolume >= 0 &&
    candle.low <= candle.open &&
    candle.low <= candle.close &&
    candle.high >= candle.open &&
    candle.high >= candle.close
  );
}
