import type { CoinMarket, CoinMarketChart } from "@crypto-realtime-dashboard/shared-types";

export type CoinGeckoMarketRaw = {
  id: unknown;
  symbol: unknown;
  name: unknown;
  image: unknown;
  current_price: unknown;
  market_cap: unknown;
  market_cap_rank: unknown;
  total_volume: unknown;
  price_change_percentage_24h: unknown;
  last_updated: unknown;
};

export type CoinGeckoMarketChartRaw = {
  prices: unknown;
  market_caps: unknown;
  total_volumes: unknown;
};

export type NormalizedMarketPayload = {
  markets: CoinMarket[];
  fetchedAt: string;
};

export type NormalizedMarketChartPayload = {
  chart: CoinMarketChart;
  fetchedAt: string;
};

export type CachePort = {
  get: (key: string, options: { type: "json" }) => Promise<unknown | null>;
  put: (key: string, value: string, options: { expirationTtl: number }) => Promise<void>;
};

export type CoinGeckoRequestOptions = {
  apiKey: string | undefined;
  cache: CachePort | undefined;
  fetcher?: typeof fetch;
};
