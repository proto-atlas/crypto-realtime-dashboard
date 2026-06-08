import { describe, expect, test } from "vitest";
import { coinMarketChartQueryKey, coinMarketChartQueryOptions } from "./useCoinMarketChart";

describe("coinMarketChartQueryOptions", () => {
  test("enabledにtrueを渡したらqueryを有効化する", () => {
    expect(coinMarketChartQueryOptions("bitcoin", true).enabled).toBe(true);
  });

  test("enabledにfalseを渡したらqueryを無効化する", () => {
    expect(coinMarketChartQueryOptions("bitcoin", false).enabled).toBe(false);
  });

  test("coinIdを渡したらqueryKeyへ含める", () => {
    expect(coinMarketChartQueryKey("bitcoin")).toEqual(["coin-market-chart", "bitcoin"]);
  });
});
