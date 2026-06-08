import type { ApiErrorResponse } from "@crypto-realtime-dashboard/shared-types";
import { Hono } from "hono";
import { describe, expect, test, vi } from "vitest";
import { app } from "./app";
import type { Bindings } from "./bindings";
import {
  COINGECKO_RATE_LIMIT_RETRY_AFTER_SECONDS,
  enforceCoinGeckoRateLimit,
  resolveClientRateLimitKey,
} from "./rate-limit";

describe("resolveClientRateLimitKey", () => {
  test("CF-Connecting-IPがあればCoinGecko用keyに使う", () => {
    const request = new Request("https://example.test/api/coingecko/coins/markets", {
      headers: {
        "cf-connecting-ip": "203.0.113.10",
      },
    });

    expect(resolveClientRateLimitKey(request)).toBe("coingecko:203.0.113.10");
  });

  test("CF-Connecting-IPがなければX-Forwarded-Forの先頭を使う", () => {
    const request = new Request("https://example.test/api/coingecko/coins/markets", {
      headers: {
        "x-forwarded-for": "198.51.100.20, 198.51.100.21",
      },
    });

    expect(resolveClientRateLimitKey(request)).toBe("coingecko:198.51.100.20");
  });
});

describe("enforceCoinGeckoRateLimit", () => {
  test("Rate Limitを超えたら429とRetry-Afterを返す", async () => {
    const limiter = {
      limit: vi.fn().mockResolvedValue({ success: false }),
    };

    const response = await app.request(
      "/api/coingecko/coins/markets",
      {
        headers: {
          "cf-connecting-ip": "203.0.113.10",
        },
      },
      {
        COINGECKO_RATE_LIMITER: limiter,
      },
    );
    const body = (await response.json()) as ApiErrorResponse;

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe(
      String(COINGECKO_RATE_LIMIT_RETRY_AFTER_SECONDS),
    );
    expect(body).toEqual({
      error: {
        type: "rate_limited",
        message: "Market data request rate limit exceeded.",
      },
    });
    expect(limiter.limit).toHaveBeenCalledWith({
      key: "coingecko:203.0.113.10",
    });
  });

  test("Rate Limit内なら通常のCoinGecko処理へ進む", async () => {
    const limiter = {
      limit: vi.fn().mockResolvedValue({ success: true }),
    };
    const testApp = new Hono<{ Bindings: Bindings }>();

    testApp.use("/api/coingecko/*", enforceCoinGeckoRateLimit);
    testApp.get("/api/coingecko/ping", (c) => c.text("ok"));

    const response = await testApp.request(
      "/api/coingecko/ping",
      {
        headers: {
          "cf-connecting-ip": "203.0.113.10",
        },
      },
      {
        COINGECKO_RATE_LIMITER: limiter,
      },
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("ok");
    expect(limiter.limit).toHaveBeenCalledWith({
      key: "coingecko:203.0.113.10",
    });
  });
});
