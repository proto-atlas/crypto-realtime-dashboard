import { afterEach, describe, expect, test, vi } from "vitest";
import { app } from "../app";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("/api/market/candles", () => {
  test("未対応のsymbolなら400を返す", async () => {
    const response = await app.request("/api/market/candles?symbol=DOGE-USD&interval=1m");

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: {
        type: "invalid_request",
        message: "ローソク足のリクエストが不正です。",
      },
    });
  });

  test("未対応のintervalなら400を返す", async () => {
    const response = await app.request("/api/market/candles?symbol=BTC-USD&interval=1w");

    expect(response.status).toBe(400);
  });

  test("Coinbase payloadを取得したらsource付きで返す", async () => {
    vi.stubGlobal("fetch", async () => Response.json([[1_700_000_000, 90, 110, 100, 105, 2]]));

    const response = await app.request("/api/market/candles?symbol=BTC-USD&interval=1m");
    const body = (await response.json()) as { data: unknown[]; source: string };

    expect(response.status).toBe(200);
    expect(body.source).toBe("coinbase");
    expect(body.data).toHaveLength(1);
  });

  test("上流fetchに失敗したらデモローソク足へ切り替える", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new Error("fetch failed");
    });

    const response = await app.request("/api/market/candles?symbol=BTC-USD&interval=1m");
    const body = (await response.json()) as { cache: string; data: unknown[]; source: string };

    expect(response.status).toBe(200);
    expect(body.source).toBe("demo");
    expect(body.cache).toBe("bypass");
    expect(body.data).toHaveLength(120);
  });

  test("上流HTTP statusが失敗ならデモローソク足へ切り替える", async () => {
    vi.stubGlobal("fetch", async () => new Response(null, { status: 429 }));

    const response = await app.request("/api/market/candles?symbol=BTC-USD&interval=1m");
    const body = (await response.json()) as { data: unknown[]; source: string };

    expect(response.status).toBe(200);
    expect(body.source).toBe("demo");
    expect(body.data).toHaveLength(120);
  });

  test("上流がJSON以外を返したら本文を露出せずデモへ切り替える", async () => {
    vi.stubGlobal("fetch", async () => new Response("<html>upstream error</html>"));

    const response = await app.request("/api/market/candles?symbol=BTC-USD&interval=1m");
    const body = (await response.json()) as { data: unknown[]; source: string };

    expect(response.status).toBe(200);
    expect(body.source).toBe("demo");
    expect(body.data).toHaveLength(120);
    expect(JSON.stringify(body)).not.toContain("upstream error");
  });

  test("デモ切り替え時も選択した時間足の間隔を維持する", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new Error("fetch failed");
    });

    const response = await app.request("/api/market/candles?symbol=BTC-USD&interval=1d");
    const body = (await response.json()) as { data: Array<{ timestamp: number }> };

    expect(body.data[1]?.timestamp - (body.data[0]?.timestamp ?? 0)).toBe(86_400_000);
  });
});
