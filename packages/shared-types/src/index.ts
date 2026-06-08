export type MarketDataMode = "live" | "demo";

export type HealthResponse = {
  ok: true;
  service: "crypto-realtime-dashboard-bff";
  mode: MarketDataMode;
  timestamp: string;
};

export type AssetSymbol = "BTC" | "ETH" | "SOL" | "XRP";

export type TradingPairSymbol = "BTCUSDT" | "ETHUSDT" | "SOLUSDT" | "XRPUSDT";

export type ChartInterval = "1m" | "5m" | "15m" | "1h" | "1d" | "1w" | "1M";

export type AssetTicker = {
  symbol: AssetSymbol;
  displayName: string;
  priceUsd: number;
  change24hPercent: number;
  volume24hUsd: number;
  updatedAt: string;
};

export type DashboardMetric = {
  label: string;
  value: string;
  tone: "neutral" | "positive" | "negative";
};

export type CoinMarket = {
  id: string;
  symbol: string;
  name: string;
  image: string | null;
  currentPriceUsd: number;
  marketCapUsd: number | null;
  marketCapRank: number | null;
  totalVolumeUsd: number | null;
  priceChangePercentage24h: number | null;
  lastUpdated: string | null;
};

export type CoinMarketChartPoint = {
  timestamp: number;
  value: number;
};

export type CoinMarketChart = {
  prices: CoinMarketChartPoint[];
  marketCaps: CoinMarketChartPoint[];
  totalVolumes: CoinMarketChartPoint[];
};

export type CandlestickPoint = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  quoteVolume: number;
};

export type MarketDataSource = "binance" | "coingecko" | "demo";

export type CacheStatus = "hit" | "miss" | "bypass";

export type MarketDataResponse<TData> = {
  source: MarketDataSource;
  cache: CacheStatus;
  updatedAt: string;
  data: TData;
};

export type ApiErrorResponse = {
  error: {
    type:
      | "configuration_error"
      | "upstream_error"
      | "upstream_http_error"
      | "upstream_network_error"
      | "rate_limited"
      | "invalid_request"
      | "invalid_upstream_payload";
    message: string;
    upstreamStatus?: number;
  };
};

export const SUPPORTED_ASSET_SYMBOLS = [
  "BTC",
  "ETH",
  "SOL",
  "XRP",
] as const satisfies readonly AssetSymbol[];

export const SUPPORTED_TRADING_PAIR_SYMBOLS = [
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
  "XRPUSDT",
] as const satisfies readonly TradingPairSymbol[];

export const SUPPORTED_CHART_INTERVALS = [
  "1m",
  "5m",
  "15m",
  "1h",
  "1d",
  "1w",
  "1M",
] as const satisfies readonly ChartInterval[];

export function isSupportedAssetSymbol(value: string): value is AssetSymbol {
  return SUPPORTED_ASSET_SYMBOLS.some((symbol) => symbol === value);
}

export function isSupportedTradingPairSymbol(value: string): value is TradingPairSymbol {
  return SUPPORTED_TRADING_PAIR_SYMBOLS.some((symbol) => symbol === value);
}

export function isSupportedChartInterval(value: string): value is ChartInterval {
  return SUPPORTED_CHART_INTERVALS.some((interval) => interval === value);
}
