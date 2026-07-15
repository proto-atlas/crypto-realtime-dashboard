import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { validateMarketCandlesResponse } from "./market-candles-validation.mjs";

describe("validateMarketCandlesResponse", () => {
  test("1分足の欠落区間が正の整数倍なら成功する", () => {
    const timestamps = Array.from({ length: 120 }, (_, index) =>
      index < 60 ? index * 60_000 : (index + 1) * 60_000,
    );

    const result = validateMarketCandlesResponse(true, createPayload(timestamps), "1m");

    assert.equal(result.ok, true);
  });

  test("5分足要求で1分間隔なら失敗する", () => {
    const timestamps = Array.from({ length: 120 }, (_, index) => index * 60_000);

    const result = validateMarketCandlesResponse(true, createPayload(timestamps), "5m");

    assert.equal(result.validTimestampSpacing, false);
  });

  test("未対応の時間足なら失敗する", () => {
    const timestamps = Array.from({ length: 120 }, (_, index) => index * 60_000);

    const result = validateMarketCandlesResponse(true, createPayload(timestamps), "1w");

    assert.equal(result.ok, false);
  });

  test("ローソク足が120本未満なら失敗する", () => {
    const result = validateMarketCandlesResponse(true, createPayload([0]), "1m");

    assert.equal(result.ok, false);
  });
});

function createPayload(timestamps) {
  return {
    source: "coinbase",
    data: timestamps.map((timestamp) => ({
      timestamp,
      open: 100,
      high: 110,
      low: 90,
      close: 105,
      volume: 2,
      quoteVolume: 210,
    })),
  };
}
