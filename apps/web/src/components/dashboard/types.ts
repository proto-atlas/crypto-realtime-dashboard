import type { AssetSymbol } from "@crypto-realtime-dashboard/shared-types";

export type MarketRow = {
  symbol: AssetSymbol;
  displayName: string;
  priceUsd: number;
  change24hPercent: number;
  volume24hUsd: number;
  updatedAt: string | null;
  sourceLabel: string;
};
