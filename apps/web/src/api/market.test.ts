import type { CoinMarketChart, MarketDataResponse } from "@crypto-realtime-dashboard/shared-types";
import { afterEach, describe, expect, test, vi } from "vitest";
import {
  createApiPath,
  createCoinMarketChartPath,
  createMarketCandlesPath,
  getCoinMarketChart,
} from "./market";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createApiPath", () => {
  test("/api配下のpathを渡したらそのまま返す", () => {
    expect(createApiPath("/api/coingecko/coins/markets")).toBe("/api/coingecko/coins/markets");
  });

  test("BFF originを渡したら絶対URLを返す", () => {
    expect(createApiPath("/api/coingecko/coins/markets", "https://example.test/")).toBe(
      "https://example.test/api/coingecko/coins/markets",
    );
  });

  test("/api配下ではないpathを渡したら例外を投げる", () => {
    expect(() => createApiPath("https://example.test/api")).toThrow("invalid_api_path");
  });

  test("既知のupstream_http_errorを受け取ったらMarketApiErrorとして投げる", async () => {
    vi.stubGlobal("fetch", async () =>
      Response.json(
        {
          error: {
            type: "upstream_http_error",
            message: "ローソク足の取得に失敗しました。",
            upstreamStatus: 451,
          },
        },
        { status: 502 },
      ),
    );

    await expect(getCoinMarketChart("bitcoin")).rejects.toMatchObject({
      name: "MarketApiError",
      status: 502,
      type: "upstream_http_error",
      message: "ローソク足の取得に失敗しました。",
    });
  });

  test("rate_limitedを受け取ったらMarketApiErrorのtypeとして保持する", async () => {
    vi.stubGlobal("fetch", async () =>
      Response.json(
        {
          error: {
            type: "rate_limited",
            message: "Market data request rate limit exceeded.",
          },
        },
        { status: 429 },
      ),
    );

    await expect(getCoinMarketChart("bitcoin")).rejects.toMatchObject({
      name: "MarketApiError",
      status: 429,
      type: "rate_limited",
      message: "Market data request rate limit exceeded.",
    });
  });
});

describe("createCoinMarketChartPath", () => {
  test("coinIdを渡したらmarket_chart用pathを返す", () => {
    expect(createCoinMarketChartPath("bitcoin")).toBe("/api/coingecko/coins/bitcoin/market_chart");
  });

  test("空文字を渡したら例外を投げる", () => {
    expect(() => createCoinMarketChartPath("")).toThrow("invalid_coin_id");
  });
});

describe("createMarketCandlesPath", () => {
  test("symbolとintervalを渡したらmarket candles用pathを返す", () => {
    expect(createMarketCandlesPath("BTC-USD", "1m")).toBe(
      "/api/market/candles?symbol=BTC-USD&interval=1m",
    );
  });
});

describe("getCoinMarketChart", () => {
  test("正常なresponseを受け取ったら履歴データを返す", async () => {
    const responseBody: MarketDataResponse<CoinMarketChart> = {
      source: "coingecko",
      cache: "hit",
      updatedAt: "2026-05-06T00:00:00.000Z",
      data: {
        prices: [{ timestamp: 1767225600000, value: 42785 }],
        marketCaps: [{ timestamp: 1767225600000, value: 838586000000 }],
        totalVolumes: [{ timestamp: 1767225600000, value: 18000000000 }],
      },
    };
    let requestedPath = "";
    vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
      requestedPath = String(input);
      return Response.json(responseBody);
    });

    await expect(getCoinMarketChart("bitcoin")).resolves.toEqual(responseBody);
    expect(requestedPath).toBe("/api/coingecko/coins/bitcoin/market_chart");
  });
});
