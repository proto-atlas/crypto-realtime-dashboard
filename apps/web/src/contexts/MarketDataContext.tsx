import type { AssetSymbol, CoinMarket } from "@crypto-realtime-dashboard/shared-types";
import { isSupportedAssetSymbol } from "@crypto-realtime-dashboard/shared-types";
import { createContext, type ReactNode, useContext, useMemo, useState } from "react";
import { createStreamMarketRows } from "@/components/dashboard/marketWatchRows";
import type { MarketRow } from "@/components/dashboard/types";
import { useCoinMarkets } from "@/hooks/useCoinMarkets";
import { useMarketTickerStream } from "@/hooks/useMarketTickerStream";
import { createDemoTickers } from "@/lib/demoMarketData";

export type DataMode = "demo" | "rest" | "websocket";

type MarketDataContextValue = {
  mode: DataMode;
  setMode: (mode: DataMode) => void;
  rows: readonly MarketRow[];
  modeLabel: string;
  marketStatus: string;
  activeStreamLabel: string;
  isMarketError: boolean;
  isStreamError: boolean;
  tickerStream: ReturnType<typeof useMarketTickerStream>;
};

const MarketDataContext = createContext<MarketDataContextValue | null>(null);

export function MarketDataProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<DataMode>("demo");
  const isRestEnabled = mode === "rest";
  const isStreamEnabled = mode === "websocket";
  const marketsQuery = useCoinMarkets(isRestEnabled);
  const tickerStream = useMarketTickerStream(isStreamEnabled);
  const restRows = useMemo(
    () => createRestRows(isRestEnabled ? marketsQuery.data?.data : undefined),
    [isRestEnabled, marketsQuery.data],
  );
  const streamBaseRows = useMemo(() => createDemoRows(), []);
  const streamRows = useMemo(
    () => createStreamMarketRows(streamBaseRows, tickerStream.lastSummary),
    [streamBaseRows, tickerStream.lastSummary],
  );
  const activeStreamLabel = getActiveStreamLabel(tickerStream.activeSource);
  const modeLabel = getDataModeLabel(mode, activeStreamLabel);
  const marketStatus = getMarketStatus({
    mode,
    activeStreamLabel,
    isFetching: marketsQuery.isFetching,
    isMarketError: marketsQuery.isError,
    streamStatus: tickerStream.status,
  });
  const value = useMemo<MarketDataContextValue>(
    () => ({
      mode,
      setMode,
      rows: isStreamEnabled ? streamRows : restRows,
      modeLabel,
      marketStatus,
      activeStreamLabel,
      isMarketError: marketsQuery.isError,
      isStreamError: tickerStream.status === "error",
      tickerStream,
    }),
    [
      activeStreamLabel,
      isStreamEnabled,
      marketStatus,
      marketsQuery.isError,
      mode,
      modeLabel,
      restRows,
      streamRows,
      tickerStream,
    ],
  );

  return <MarketDataContext.Provider value={value}>{children}</MarketDataContext.Provider>;
}

export function useMarketData() {
  const context = useContext(MarketDataContext);

  if (context === null) {
    throw new Error("MarketDataProviderが必要です。");
  }

  return context;
}

export function getDataModeLabel(mode: DataMode, activeStreamLabel: string) {
  switch (mode) {
    case "demo":
      return "デモ";
    case "rest":
      return "REST連携";
    case "websocket":
      return `WebSocket連携 (${activeStreamLabel})`;
  }
}

function createRestRows(markets: readonly CoinMarket[] | undefined) {
  if (markets === undefined) {
    return createDemoRows();
  }

  return markets.flatMap((market) => {
    const symbol = market.symbol.toUpperCase();

    return isSupportedAssetSymbol(symbol) ? [createLiveTicker(market, symbol)] : [];
  });
}

function createDemoRows(): MarketRow[] {
  return createDemoTickers().map((ticker) => ({
    ...ticker,
    sourceLabel: "デモ",
  }));
}

function createLiveTicker(market: CoinMarket, symbol: AssetSymbol): MarketRow {
  return {
    symbol,
    displayName: market.name,
    priceUsd: market.currentPriceUsd,
    change24hPercent: market.priceChangePercentage24h ?? 0,
    volume24hUsd: market.totalVolumeUsd ?? 0,
    updatedAt: market.lastUpdated,
    sourceLabel: "CoinGecko REST",
  };
}

function getActiveStreamLabel(source: "coinbase" | "binance" | null) {
  if (source === "coinbase") {
    return "Coinbase";
  }

  if (source === "binance") {
    return "Binance";
  }

  return "WebSocket";
}

function getMarketStatus({
  mode,
  activeStreamLabel,
  isFetching,
  isMarketError,
  streamStatus,
}: {
  mode: DataMode;
  activeStreamLabel: string;
  isFetching: boolean;
  isMarketError: boolean;
  streamStatus: "idle" | "connecting" | "open" | "closed" | "error";
}) {
  if (mode === "websocket") {
    if (streamStatus === "open") {
      return `${activeStreamLabel}マーケットデータをストリーミング中`;
    }

    return streamStatus === "error" ? "WebSocketを利用できません" : "WebSocket中継へ接続中";
  }

  if (mode === "rest") {
    if (isFetching) {
      return "公開マーケットデータを取得中";
    }

    return isMarketError ? "公開APIを利用できません" : "REST取得データ";
  }

  return "固定データ";
}
