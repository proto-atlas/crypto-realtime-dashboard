import type {
  AssetSymbol,
  ChartInterval,
  MarketPairSymbol,
} from "@crypto-realtime-dashboard/shared-types";
import {
  isSupportedAssetSymbol,
  isSupportedChartInterval,
} from "@crypto-realtime-dashboard/shared-types";

export type MarketSearch = {
  asset: AssetSymbol;
  interval: ChartInterval;
};

export function normalizeMarketSearch(search: Record<string, unknown>): MarketSearch {
  const asset = typeof search.asset === "string" ? search.asset.toUpperCase() : "";
  const interval = typeof search.interval === "string" ? search.interval : "";

  return {
    asset: isSupportedAssetSymbol(asset) ? asset : "BTC",
    interval: isSupportedChartInterval(interval) ? interval : "1m",
  };
}

export function toMarketPairSymbol(asset: AssetSymbol): MarketPairSymbol {
  return `${asset}-USD`;
}

export function formatDataFreshness(updatedAt: string | null, nowMs = Date.now()) {
  if (updatedAt === "demo") {
    return "デモデータ";
  }

  if (updatedAt === null) {
    return "受信待ち";
  }

  const updatedAtMs = Date.parse(updatedAt);
  if (!Number.isFinite(updatedAtMs)) {
    return "更新時刻不明";
  }

  const elapsedSeconds = Math.max(0, Math.floor((nowMs - updatedAtMs) / 1000));
  if (elapsedSeconds < 10) {
    return "最新";
  }

  if (elapsedSeconds < 60) {
    return `${elapsedSeconds}秒前`;
  }

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  return elapsedMinutes < 60 ? `${elapsedMinutes}分前` : "1時間以上前";
}

export function getNextMarketIndex(
  currentIndex: number,
  direction: "previous" | "next",
  itemCount: number,
) {
  if (itemCount <= 0) {
    return -1;
  }

  const offset = direction === "next" ? 1 : -1;
  return (currentIndex + offset + itemCount) % itemCount;
}
