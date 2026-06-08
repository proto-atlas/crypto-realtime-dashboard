import { describe, expect, test } from "vitest";
import { normalizeMarketChart, normalizeMarkets } from "./normalize";

describe("normalizeMarkets", () => {
  test("CoinGeckoのmarket payloadを渡したらcamelCaseの市場データに変換する", () => {
    const markets = normalizeMarkets([
      {
        id: "bitcoin",
        symbol: "btc",
        name: "Bitcoin",
        image: "https://example.test/btc.png",
        current_price: 70187,
        market_cap: 1381651251183,
        market_cap_rank: 1,
        total_volume: 20154184933,
        price_change_percentage_24h: 3.12502,
        last_updated: "2024-04-07T16:49:31.736Z",
      },
    ]);

    expect(markets).toEqual([
      {
        id: "bitcoin",
        symbol: "btc",
        name: "Bitcoin",
        image: "https://example.test/btc.png",
        currentPriceUsd: 70187,
        marketCapUsd: 1381651251183,
        marketCapRank: 1,
        totalVolumeUsd: 20154184933,
        priceChangePercentage24h: 3.12502,
        lastUpdated: "2024-04-07T16:49:31.736Z",
      },
    ]);
  });

  test("必須フィールドがないmarket payloadを渡したら例外を投げる", () => {
    expect(() => normalizeMarkets([{ id: "bitcoin" }])).toThrow("invalid_market_payload");
  });
});

describe("normalizeMarketChart", () => {
  test("CoinGeckoのmarket_chart payloadを渡したら時系列データに変換する", () => {
    const chart = normalizeMarketChart({
      prices: [[1711843200000, 69702.3087473573]],
      market_caps: [[1711843200000, 1370247487960.09]],
      total_volumes: [[1711843200000, 16408802301.8374]],
    });

    expect(chart).toEqual({
      prices: [{ timestamp: 1711843200000, value: 69702.3087473573 }],
      marketCaps: [{ timestamp: 1711843200000, value: 1370247487960.09 }],
      totalVolumes: [{ timestamp: 1711843200000, value: 16408802301.8374 }],
    });
  });
});
