import type {
  ApiErrorResponse,
  CoinMarket,
  MarketDataResponse,
} from "@crypto-realtime-dashboard/shared-types";
import { describe, expect, test, vi } from "vitest";
import { app } from "../app";

describe("/api/coingecko/coins/markets", () => {
  test("API keyが未設定なら503を返す", async () => {
    const response = await app.request("/api/coingecko/coins/markets");
    const body = (await response.json()) as ApiErrorResponse;

    expect(response.status).toBe(503);
    expect(body).toEqual({
      error: {
        type: "configuration_error",
        message: "CoinGecko API key is not configured.",
      },
    });
  });

  test("API keyが設定済みならCoinGeckoレスポンスを正規化して返す", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
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
    );

    const response = await app.request(
      "/api/coingecko/coins/markets",
      {},
      {
        COINGECKO_API_KEY: "demo-key",
      },
    );
    const body = (await response.json()) as MarketDataResponse<CoinMarket[]>;

    expect(response.status).toBe(200);
    expect(body.data[0].currentPriceUsd).toBe(70187);
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toEqual({
      "x-cg-demo-api-key": "demo-key",
      accept: "application/json",
    });

    fetchMock.mockRestore();
  });
});
