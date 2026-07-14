import type { ChartInterval, MarketPairSymbol } from "@crypto-realtime-dashboard/shared-types";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { getMarketCandles } from "@/api/market";

export function marketCandlesQueryKey(symbol: MarketPairSymbol, interval: ChartInterval) {
  return ["market-candles", symbol, interval] as const;
}

export function marketCandlesQueryOptions(
  symbol: MarketPairSymbol,
  interval: ChartInterval,
  enabled: boolean,
) {
  return queryOptions({
    queryKey: marketCandlesQueryKey(symbol, interval),
    queryFn: () => getMarketCandles(symbol, interval),
    enabled,
    staleTime: 30_000,
  });
}

export function useMarketCandles(
  symbol: MarketPairSymbol,
  interval: ChartInterval,
  enabled: boolean,
) {
  return useQuery(marketCandlesQueryOptions(symbol, interval, enabled));
}
