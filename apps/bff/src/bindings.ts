export type Bindings = {
  COINGECKO_API_KEY?: string;
  MARKET_CACHE?: KVNamespace;
  COINGECKO_RATE_LIMITER?: RateLimit;
  BINANCE_TICKER_RELAY?: DurableObjectNamespace;
  COINBASE_TICKER_RELAY?: DurableObjectNamespace;
};
