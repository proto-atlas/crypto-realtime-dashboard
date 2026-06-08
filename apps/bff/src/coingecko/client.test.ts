import { describe, expect, test } from "vitest";
import { COINGECKO_CACHE_TTL_SECONDS } from "./cache";
import { fetchCoinMarkets, normalizeCoinId } from "./client";
import type { CachePort } from "./types";

describe("normalizeCoinId", () => {
  test("小文字英数字とハイフンのIDを渡したら正規化して返す", () => {
    expect(normalizeCoinId(" Bitcoin ")).toBe("bitcoin");
  });

  test("許可していない文字を含むIDを渡したら例外を投げる", () => {
    expect(() => normalizeCoinId("../bitcoin")).toThrow("invalid_coin_id");
  });
});

describe("fetchCoinMarkets", () => {
  test("キャッシュがhitしたらfetchを呼ばずに市場データを返す", async () => {
    const cache = createCache({
      markets: [
        {
          id: "bitcoin",
          symbol: "btc",
          name: "Bitcoin",
          image: null,
          currentPriceUsd: 70187,
          marketCapUsd: null,
          marketCapRank: 1,
          totalVolumeUsd: null,
          priceChangePercentage24h: null,
          lastUpdated: null,
        },
      ],
      fetchedAt: "2026-05-06T00:00:00.000Z",
    });
    let fetchCalled = false;

    const result = await fetchCoinMarkets({
      apiKey: "demo-key",
      cache,
      fetcher: async () => {
        fetchCalled = true;
        return Response.json([]);
      },
    });

    expect(fetchCalled).toBe(false);
    expect(result.cache).toBe("hit");
    expect(result.data[0]?.id).toBe("bitcoin");
  });

  test("キャッシュがmissしたらfetch結果をTTL付きで保存する", async () => {
    const cache = createCache(null);

    const result = await fetchCoinMarkets({
      apiKey: "demo-key",
      cache,
      fetcher: async () =>
        Response.json([
          {
            id: "bitcoin",
            symbol: "btc",
            name: "Bitcoin",
            image: null,
            current_price: 70187,
            market_cap: null,
            market_cap_rank: 1,
            total_volume: null,
            price_change_percentage_24h: null,
            last_updated: null,
          },
        ]),
    });

    expect(result.cache).toBe("miss");
    expect(cache.lastPut?.options).toEqual({ expirationTtl: COINGECKO_CACHE_TTL_SECONDS });
  });
});

function createCache(initialValue: unknown) {
  const state: {
    value: unknown;
    lastPut: { key: string; value: string; options: { expirationTtl: number } } | null;
  } = {
    value: initialValue,
    lastPut: null,
  };

  const cache: CachePort & typeof state = {
    ...state,
    async get() {
      return cache.value;
    },
    async put(key, value, options) {
      cache.value = JSON.parse(value) as unknown;
      cache.lastPut = { key, value, options };
    },
  };

  return cache;
}
