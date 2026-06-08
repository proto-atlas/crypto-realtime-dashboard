import { describe, expect, test } from "vitest";
import { binanceKlinesQueryKey, binanceKlinesQueryOptions } from "./useBinanceKlines";

describe("binanceKlinesQueryOptions", () => {
  test("enabledにtrueを渡したらqueryを有効化する", () => {
    expect(binanceKlinesQueryOptions("BTCUSDT", "1m", true).enabled).toBe(true);
  });

  test("enabledにfalseを渡したらqueryを無効化する", () => {
    expect(binanceKlinesQueryOptions("BTCUSDT", "1m", false).enabled).toBe(false);
  });

  test("symbolとintervalを渡したらqueryKeyへ含める", () => {
    expect(binanceKlinesQueryKey("BTCUSDT", "1m")).toEqual(["binance-klines", "BTCUSDT", "1m"]);
  });
});
