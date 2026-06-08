import { describe, expect, test } from "vitest";
import { coinMarketsQueryKey, coinMarketsQueryOptions } from "./useCoinMarkets";

describe("coinMarketsQueryOptions", () => {
  test("enabledにtrueを渡したらqueryを有効化する", () => {
    expect(coinMarketsQueryOptions(true).enabled).toBe(true);
  });

  test("enabledにfalseを渡したらqueryを無効化する", () => {
    expect(coinMarketsQueryOptions(false).enabled).toBe(false);
  });

  test("queryKeyはcoin-marketsを返す", () => {
    expect(coinMarketsQueryKey).toEqual(["coin-markets"]);
  });
});
