import { describe, expect, test, vi } from "vitest";
import {
  fetchCoinbaseCandles,
  normalizeChartInterval,
  normalizeCoinbaseCandles,
  normalizeMarketPairSymbol,
} from "./candles";

describe("normalizeMarketPairSymbol", () => {
  test("小文字の対応ペアをUSD建て表記へ正規化する", () => {
    expect(normalizeMarketPairSymbol("btc-usd")).toBe("BTC-USD");
  });

  test("未対応の取引ペアを拒否する", () => {
    expect(() => normalizeMarketPairSymbol("DOGE-USD")).toThrow("invalid_market_pair_symbol");
  });
});

describe("normalizeChartInterval", () => {
  test("対応している足種を返す", () => {
    expect(normalizeChartInterval("15m")).toBe("15m");
  });

  test("週足を拒否する", () => {
    expect(() => normalizeChartInterval("1w")).toThrow("invalid_chart_interval");
  });
});

describe("normalizeCoinbaseCandles", () => {
  test("Coinbase配列を時刻昇順にする", () => {
    expect(
      normalizeCoinbaseCandles([
        [1_700_000_060, 95, 112, 100, 108, 3],
        [1_700_000_000, 90, 110, 100, 105, 2],
      ]),
    ).toEqual([
      {
        timestamp: 1_700_000_000_000,
        open: 100,
        high: 110,
        low: 90,
        close: 105,
        volume: 2,
        quoteVolume: 210,
      },
      {
        timestamp: 1_700_000_060_000,
        open: 100,
        high: 112,
        low: 95,
        close: 108,
        volume: 3,
        quoteVolume: 324,
      },
    ]);
  });

  test("121本なら最新120本だけ返す", () => {
    const payload = Array.from({ length: 121 }, (_, index) => [index, 90, 110, 100, 105, 2]);

    const candles = normalizeCoinbaseCandles(payload);

    expect(candles).toHaveLength(120);
    expect(candles[0]?.timestamp).toBe(1000);
    expect(candles.at(-1)?.timestamp).toBe(120_000);
  });

  test("空配列を拒否する", () => {
    expect(() => normalizeCoinbaseCandles([])).toThrow("invalid_coinbase_candles_payload");
  });

  test("配列でないpayloadを拒否する", () => {
    expect(() => normalizeCoinbaseCandles({ data: [] })).toThrow(
      "invalid_coinbase_candles_payload",
    );
  });

  test("6要素未満のrowを拒否する", () => {
    expect(() => normalizeCoinbaseCandles([[1_700_000_000, 90, 110, 100, 105]])).toThrow(
      "invalid_coinbase_candles_payload",
    );
  });

  test("非有限数を含むrowを拒否する", () => {
    expect(() =>
      normalizeCoinbaseCandles([[1_700_000_000, 90, Number.POSITIVE_INFINITY, 100, 105, 2]]),
    ).toThrow("invalid_coinbase_candles_payload");
  });

  test("価格が0のrowを拒否する", () => {
    expect(() => normalizeCoinbaseCandles([[1_700_000_000, 0, 110, 100, 105, 2]])).toThrow(
      "invalid_coinbase_candles_payload",
    );
  });

  test("同一timestampを含むpayloadを拒否する", () => {
    expect(() =>
      normalizeCoinbaseCandles([
        [1_700_000_000, 90, 110, 100, 105, 2],
        [1_700_000_000, 91, 111, 101, 106, 4],
      ]),
    ).toThrow("invalid_coinbase_candles_payload");
  });

  test("ミリ秒変換後に安全整数を超えるtimestampを拒否する", () => {
    expect(() =>
      normalizeCoinbaseCandles([[Number.MAX_SAFE_INTEGER, 90, 110, 100, 105, 2]]),
    ).toThrow("invalid_coinbase_candles_payload");
  });

  test("openがhighを超えるローソク足を拒否する", () => {
    expect(() => normalizeCoinbaseCandles([[1_700_000_000, 90, 99, 100, 95, 2]])).toThrow(
      "invalid_coinbase_candles_payload",
    );
  });

  test("負の出来高を持つローソク足を拒否する", () => {
    expect(() => normalizeCoinbaseCandles([[1_700_000_000, 90, 110, 100, 105, -1]])).toThrow(
      "invalid_coinbase_candles_payload",
    );
  });
});

describe("fetchCoinbaseCandles", () => {
  const validPayload = [[1_700_000_000, 90, 110, 100, 105, 2]];

  test("時間足を秒へ変換し、識別可能なUser-Agent付きで取得する", async () => {
    const fetcher = vi.fn(async () => Response.json(validPayload));

    const result = await fetchCoinbaseCandles("BTC-USD", "5m", { fetcher });

    expect(result.cache).toBe("bypass");
    expect(result.symbol).toBe("BTC-USD");
    expect(result.interval).toBe("5m");
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=300",
      {
        headers: {
          accept: "application/json",
          "user-agent": "crypto-realtime-dashboard/1.0",
        },
        signal: expect.any(AbortSignal),
      },
    );
  });

  test("provider・pair・intervalを含むキーで30秒キャッシュする", async () => {
    const cache = {
      get: vi.fn(async () => null),
      put: vi.fn(async () => undefined),
    };
    const fetcher = vi.fn(async () => Response.json(validPayload));

    const result = await fetchCoinbaseCandles("BTC-USD", "1m", { cache, fetcher });

    expect(result.cache).toBe("miss");
    expect(cache.get).toHaveBeenCalledWith("coinbase:candles:BTC-USD:1m", { type: "json" });
    expect(cache.put).toHaveBeenCalledWith("coinbase:candles:BTC-USD:1m", expect.any(String), {
      expirationTtl: 30,
    });
  });

  test("timestampが重複したキャッシュを無視して上流から取得する", async () => {
    const cachedCandle = {
      timestamp: 1_700_000_000_000,
      open: 100,
      high: 110,
      low: 90,
      close: 105,
      volume: 2,
      quoteVolume: 210,
    };
    const cache = {
      async get<TValue>() {
        return {
          fetchedAt: "2026-07-15T00:00:00.000Z",
          candles: [cachedCandle, cachedCandle],
        } as unknown as TValue;
      },
      put: vi.fn(async () => undefined),
    };
    const fetcher = vi.fn(async () => Response.json(validPayload));

    const result = await fetchCoinbaseCandles("BTC-USD", "1m", { cache, fetcher });

    expect(result.cache).toBe("miss");
  });

  test("120本を超えるキャッシュを無視して上流から取得する", async () => {
    const cache = createCacheWithCandles(
      Array.from({ length: 121 }, (_, index) => createCachedCandle(index * 60_000)),
    );
    const fetcher = vi.fn(async () => Response.json(validPayload));

    const result = await fetchCoinbaseCandles("BTC-USD", "1m", { cache, fetcher });

    expect(result.cache).toBe("miss");
  });

  test("timestampが降順のキャッシュを無視して上流から取得する", async () => {
    const cache = createCacheWithCandles([createCachedCandle(120_000), createCachedCandle(60_000)]);
    const fetcher = vi.fn(async () => Response.json(validPayload));

    const result = await fetchCoinbaseCandles("BTC-USD", "1m", { cache, fetcher });

    expect(result.cache).toBe("miss");
  });

  test("quoteVolumeが終値と出来高に一致しないキャッシュを無視する", async () => {
    const cache = createCacheWithCandles([{ ...createCachedCandle(60_000), quoteVolume: 999 }]);
    const fetcher = vi.fn(async () => Response.json(validPayload));

    const result = await fetchCoinbaseCandles("BTC-USD", "1m", { cache, fetcher });

    expect(result.cache).toBe("miss");
  });

  test("上流fetchが失敗したらnetwork errorを投げる", async () => {
    const fetcher = vi.fn(async () => {
      throw new Error("fetch failed");
    });

    await expect(fetchCoinbaseCandles("BTC-USD", "1m", { fetcher })).rejects.toThrow(
      "coinbase_network_error",
    );
  });

  test("上流HTTP statusが失敗ならstatus付き例外を投げる", async () => {
    const fetcher = vi.fn(async () => new Response(null, { status: 429 }));

    await expect(fetchCoinbaseCandles("BTC-USD", "1m", { fetcher })).rejects.toMatchObject({
      message: "coinbase_upstream_http_error",
      statusCode: 429,
    });
  });

  test("上流fetchが規定時間を超えたらtimeout errorを投げる", async () => {
    vi.useFakeTimers();

    try {
      const fetcher = vi.fn(
        (_input: RequestInfo | URL, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => {
              reject(new DOMException("The operation was aborted.", "AbortError"));
            });
          }),
      );
      const request = fetchCoinbaseCandles("BTC-USD", "1m", { fetcher });
      const expectation = expect(request).rejects.toThrow("coinbase_timeout_error");

      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(8_000);

      await expectation;
    } finally {
      vi.useRealTimers();
    }
  });

  test("上流取得が成功したらtimeout timerを解除する", async () => {
    vi.useFakeTimers();

    try {
      const fetcher = vi.fn(async () => Response.json(validPayload));

      await fetchCoinbaseCandles("BTC-USD", "1m", { fetcher });

      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  test("上流HTTP errorでもtimeout timerを解除する", async () => {
    vi.useFakeTimers();

    try {
      const fetcher = vi.fn(async () => new Response(null, { status: 500 }));

      await expect(fetchCoinbaseCandles("BTC-USD", "1m", { fetcher })).rejects.toThrow(
        "coinbase_upstream_http_error",
      );
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  test("上流JSON errorでもtimeout timerを解除する", async () => {
    vi.useFakeTimers();

    try {
      const fetcher = vi.fn(
        async () => new Response("{", { headers: { "content-type": "application/json" } }),
      );

      await expect(fetchCoinbaseCandles("BTC-USD", "1m", { fetcher })).rejects.toThrow(
        "invalid_coinbase_candles_payload",
      );
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});

function createCachedCandle(timestamp: number) {
  return {
    timestamp,
    open: 100,
    high: 110,
    low: 90,
    close: 105,
    volume: 2,
    quoteVolume: 210,
  };
}

function createCacheWithCandles(candles: ReturnType<typeof createCachedCandle>[]) {
  return {
    async get<TValue>() {
      return {
        fetchedAt: "2026-07-15T00:00:00.000Z",
        candles,
      } as unknown as TValue;
    },
    put: vi.fn(async () => undefined),
  };
}
