import type { ChartInterval, TradingPairSymbol } from "@crypto-realtime-dashboard/shared-types";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { getBinanceKlines } from "@/api/market";

export function binanceKlinesQueryKey(symbol: TradingPairSymbol, interval: ChartInterval) {
  return ["binance-klines", symbol, interval] as const;
}

export function binanceKlinesQueryOptions(
  symbol: TradingPairSymbol,
  interval: ChartInterval,
  enabled: boolean,
) {
  return queryOptions({
    queryKey: binanceKlinesQueryKey(symbol, interval),
    queryFn: () => getBinanceKlines(symbol, interval),
    enabled,
    staleTime: 30_000,
  });
}

export function useBinanceKlines(
  symbol: TradingPairSymbol,
  interval: ChartInterval,
  enabled: boolean,
) {
  return useQuery(binanceKlinesQueryOptions(symbol, interval, enabled));
}
