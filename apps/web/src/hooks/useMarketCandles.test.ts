import { describe, expect, test } from "vitest";
import { marketCandlesQueryKey, marketCandlesQueryOptions } from "./useMarketCandles";

describe("marketCandlesQueryOptions", () => {
  test("enabledにtrueを渡したらqueryを有効化する", () => {
    expect(marketCandlesQueryOptions("BTC-USD", "1m", true).enabled).toBe(true);
  });

  test("enabledにfalseを渡したらqueryを無効化する", () => {
    expect(marketCandlesQueryOptions("BTC-USD", "1m", false).enabled).toBe(false);
  });

  test("symbolとintervalをqueryKeyへ含める", () => {
    expect(marketCandlesQueryKey("BTC-USD", "1m")).toEqual(["market-candles", "BTC-USD", "1m"]);
  });
});
