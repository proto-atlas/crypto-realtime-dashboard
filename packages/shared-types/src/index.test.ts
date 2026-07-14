import { describe, expect, test } from "vitest";
import {
  isSupportedAssetSymbol,
  isSupportedChartInterval,
  isSupportedMarketPairSymbol,
} from "./index";

describe("isSupportedAssetSymbol", () => {
  test("対応している銘柄コードを渡したらtrueを返す", () => {
    expect(isSupportedAssetSymbol("BTC")).toBe(true);
  });

  test("対応していない銘柄コードを渡したらfalseを返す", () => {
    expect(isSupportedAssetSymbol("DOGE")).toBe(false);
  });

  test("空文字を渡したらfalseを返す", () => {
    expect(isSupportedAssetSymbol("")).toBe(false);
  });
});

describe("isSupportedMarketPairSymbol", () => {
  test("対応している取引ペアを渡したらtrueを返す", () => {
    expect(isSupportedMarketPairSymbol("BTC-USD")).toBe(true);
  });

  test("対応していない取引ペアを渡したらfalseを返す", () => {
    expect(isSupportedMarketPairSymbol("DOGE-USD")).toBe(false);
  });
});

describe("isSupportedChartInterval", () => {
  test("対応している足種を渡したらtrueを返す", () => {
    expect(isSupportedChartInterval("15m")).toBe(true);
  });

  test("対応していない足種を渡したらfalseを返す", () => {
    expect(isSupportedChartInterval("1w")).toBe(false);
  });
});
