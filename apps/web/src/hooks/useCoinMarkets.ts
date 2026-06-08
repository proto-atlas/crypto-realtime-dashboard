import { queryOptions, useQuery } from "@tanstack/react-query";
import { getCoinMarkets } from "@/api/market";

export const coinMarketsQueryKey = ["coin-markets"] as const;

export function coinMarketsQueryOptions(enabled: boolean) {
  return queryOptions({
    queryKey: coinMarketsQueryKey,
    queryFn: getCoinMarkets,
    enabled,
    staleTime: 300_000,
  });
}

export function useCoinMarkets(enabled: boolean) {
  return useQuery(coinMarketsQueryOptions(enabled));
}
