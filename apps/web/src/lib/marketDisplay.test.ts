import { describe, expect, test } from "vitest";
import {
  formatDataFreshness,
  getNextMarketIndex,
  normalizeMarketSearch,
  toMarketPairSymbol,
} from "./marketDisplay";

describe("normalizeMarketSearch", () => {
  test("対応銘柄と時間足を渡したらそのまま返す", () => {
    expect(normalizeMarketSearch({ asset: "ETH", interval: "15m" })).toEqual({
      asset: "ETH",
      interval: "15m",
    });
  });

  test("不正な値を渡したらBTCと1mへ戻す", () => {
    expect(normalizeMarketSearch({ asset: "DOGE", interval: "1w" })).toEqual({
      asset: "BTC",
      interval: "1m",
    });
  });
});

test("AssetSymbolをCoinbaseのUSDペアへ変換する", () => {
  expect(toMarketPairSymbol("SOL")).toBe("SOL-USD");
});

describe("formatDataFreshness", () => {
  const nowMs = Date.parse("2026-07-18T00:01:00.000Z");

  test("10秒未満なら最新と表示する", () => {
    expect(formatDataFreshness("2026-07-18T00:00:55.000Z", nowMs)).toBe("最新");
  });

  test("60秒未満なら秒数を表示する", () => {
    expect(formatDataFreshness("2026-07-18T00:00:18.000Z", nowMs)).toBe("42秒前");
  });

  test("デモ時刻ならデモデータと表示する", () => {
    expect(formatDataFreshness("demo", nowMs)).toBe("デモデータ");
  });

  test("時刻がなければ受信待ちと表示する", () => {
    expect(formatDataFreshness(null, nowMs)).toBe("受信待ち");
  });
});

describe("getNextMarketIndex", () => {
  test("末尾から次へ進んだら先頭へ戻る", () => {
    expect(getNextMarketIndex(3, "next", 4)).toBe(0);
  });

  test("先頭から前へ戻ったら末尾へ移る", () => {
    expect(getNextMarketIndex(0, "previous", 4)).toBe(3);
  });

  test("項目が空ならマイナス1を返す", () => {
    expect(getNextMarketIndex(0, "next", 0)).toBe(-1);
  });
});
