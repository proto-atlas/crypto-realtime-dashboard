import { describe, expect, test, vi } from "vitest";
import {
  fetchBinanceKlines,
  normalizeBinanceKlines,
  normalizeChartInterval,
  normalizeTradingPairSymbol,
} from "./klines";

describe("normalizeTradingPairSymbol", () => {
  test("小文字の対応ペアを渡したら大文字の取引ペアを返す", () => {
    expect(normalizeTradingPairSymbol("btcusdt")).toBe("BTCUSDT");
  });

  test("未対応の取引ペアを渡したら例外を投げる", () => {
    expect(() => normalizeTradingPairSymbol("DOGEUSDT")).toThrow("invalid_binance_symbol");
  });
});

describe("normalizeChartInterval", () => {
  test("対応している足種を渡したらそのまま返す", () => {
    expect(normalizeChartInterval("1m")).toBe("1m");
  });

  test("未対応の足種を渡したら例外を投げる", () => {
    expect(() => normalizeChartInterval("2m")).toThrow("invalid_binance_interval");
  });
});

describe("normalizeBinanceKlines", () => {
  test("Binance kline配列を渡したらcandlestickへ正規化する", () => {
    expect(
      normalizeBinanceKlines([
        [
          1499040000000,
          "0.01634790",
          "0.80000000",
          "0.01575800",
          "0.01577100",
          "148976.11427815",
          1499644799999,
          "2434.19055334",
          308,
          "1756.87402397",
          "28.46694368",
          "0",
        ],
      ]),
    ).toEqual([
      {
        timestamp: 1499040000000,
        open: 0.0163479,
        high: 0.8,
        low: 0.015758,
        close: 0.015771,
        volume: 148976.11427815,
        quoteVolume: 2434.19055334,
      },
    ]);
  });

  test("空配列を渡したら例外を投げる", () => {
    expect(() => normalizeBinanceKlines([])).toThrow("invalid_binance_klines_payload");
  });
});

describe("fetchBinanceKlines", () => {
  const validPayload = [
    [
      1499040000000,
      "100.00",
      "110.00",
      "90.00",
      "105.00",
      "12.5",
      1499644799999,
      "1300.00",
      308,
      "0",
      "0",
      "0",
    ],
  ];

  test("正常なpayloadを受け取ったらklinesを返す", async () => {
    const requestedUrls: string[] = [];
    const fetcher = vi.fn(
      async (input: Parameters<typeof fetch>[0], _init?: Parameters<typeof fetch>[1]) => {
        requestedUrls.push(String(input));

        return Response.json(validPayload);
      },
    );

    const result = await fetchBinanceKlines("BTCUSDT", "1m", { fetcher });

    expect(result.cache).toBe("bypass");
    expect(result.symbol).toBe("BTCUSDT");
    expect(result.interval).toBe("1m");
    expect(result.data[0]).toEqual({
      timestamp: 1499040000000,
      open: 100,
      high: 110,
      low: 90,
      close: 105,
      volume: 12.5,
      quoteVolume: 1300,
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(requestedUrls).toEqual([
      "https://data-api.binance.vision/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=120",
    ]);
  });

  test("cache readに失敗しても上流payloadからklinesを返す", async () => {
    const cache = {
      async get<TValue = unknown>(): Promise<TValue | null> {
        throw new Error("kv get failed");
      },
      async put(): Promise<void> {
        return undefined;
      },
    };
    const fetcher = vi.fn(async () => Response.json(validPayload));

    const result = await fetchBinanceKlines("BTCUSDT", "1m", { cache, fetcher });

    expect(result.cache).toBe("miss");
    expect(result.data).toHaveLength(1);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  test("cache writeに失敗してもklinesを返す", async () => {
    let putCount = 0;
    const cache = {
      async get<TValue = unknown>(): Promise<TValue | null> {
        return null;
      },
      async put(): Promise<void> {
        putCount += 1;
        throw new Error("kv put failed");
      },
    };
    const fetcher = vi.fn(async () => Response.json(validPayload));

    const result = await fetchBinanceKlines("BTCUSDT", "1m", { cache, fetcher });

    expect(result.cache).toBe("miss");
    expect(result.data).toHaveLength(1);
    expect(putCount).toBe(1);
  });

  test("上流fetchが失敗したらnetwork errorとして例外を投げる", async () => {
    const fetcher = vi.fn(async () => {
      throw new Error("fetch failed");
    });

    await expect(fetchBinanceKlines("BTCUSDT", "1m", { fetcher })).rejects.toThrow(
      "binance_network_error",
    );
  });

  test("上流HTTP statusが失敗ならstatus付き例外を投げる", async () => {
    const fetcher = vi.fn(async () => new Response(null, { status: 451 }));

    await expect(fetchBinanceKlines("BTCUSDT", "1m", { fetcher })).rejects.toMatchObject({
      message: "binance_upstream_http_error",
      statusCode: 451,
    });
  });
});
