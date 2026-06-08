import type {
  ApiErrorResponse,
  CoinMarket,
  CoinMarketChart,
  MarketDataResponse,
} from "@crypto-realtime-dashboard/shared-types";
import { Hono } from "hono";
import type { Bindings } from "../bindings";
import { fetchCoinMarketChart, fetchCoinMarkets } from "./client";

export const coingeckoRoutes = new Hono<{ Bindings: Bindings }>();

coingeckoRoutes.get("/coins/markets", async (c) => {
  try {
    const result = await fetchCoinMarkets({
      apiKey: c.env?.COINGECKO_API_KEY,
      cache: c.env?.MARKET_CACHE,
    });
    const response: MarketDataResponse<CoinMarket[]> = {
      source: "coingecko",
      cache: result.cache,
      updatedAt: result.fetchedAt,
      data: result.data,
    };

    return c.json(response);
  } catch (error) {
    return handleCoinGeckoError(error);
  }
});

coingeckoRoutes.get("/coins/:id/market_chart", async (c) => {
  try {
    const result = await fetchCoinMarketChart(c.req.param("id"), {
      apiKey: c.env?.COINGECKO_API_KEY,
      cache: c.env?.MARKET_CACHE,
    });
    const response: MarketDataResponse<CoinMarketChart> = {
      source: "coingecko",
      cache: result.cache,
      updatedAt: result.fetchedAt,
      data: result.data,
    };

    return c.json(response);
  } catch (error) {
    return handleCoinGeckoError(error);
  }
});

function handleCoinGeckoError(error: unknown) {
  const errorType = error instanceof Error ? error.message : "unknown_error";

  if (errorType === "missing_coingecko_api_key") {
    const response: ApiErrorResponse = {
      error: {
        type: "configuration_error",
        message: "CoinGecko API key is not configured.",
      },
    };

    return Response.json(response, { status: 503 });
  }

  if (errorType === "invalid_coin_id") {
    const response: ApiErrorResponse = {
      error: {
        type: "invalid_request",
        message: "Coin ID is invalid.",
      },
    };

    return Response.json(response, { status: 400 });
  }

  if (errorType.startsWith("invalid_")) {
    const response: ApiErrorResponse = {
      error: {
        type: "invalid_upstream_payload",
        message: "CoinGecko payload could not be normalized.",
      },
    };

    return Response.json(response, { status: 502 });
  }

  const response: ApiErrorResponse = {
    error: {
      type: "upstream_error",
      message: "CoinGecko request failed.",
    },
  };

  return Response.json(response, { status: 502 });
}
