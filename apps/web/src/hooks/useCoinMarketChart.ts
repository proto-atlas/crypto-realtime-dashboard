import { queryOptions, useQuery } from "@tanstack/react-query";
import { getCoinMarketChart } from "@/api/market";

export function coinMarketChartQueryKey(coinId: string) {
  return ["coin-market-chart", coinId] as const;
}

export function coinMarketChartQueryOptions(coinId: string, enabled: boolean) {
  return queryOptions({
    queryKey: coinMarketChartQueryKey(coinId),
    queryFn: () => getCoinMarketChart(coinId),
    enabled,
    staleTime: 300_000,
  });
}

export function useCoinMarketChart(coinId: string, enabled: boolean) {
  return useQuery(coinMarketChartQueryOptions(coinId, enabled));
}
