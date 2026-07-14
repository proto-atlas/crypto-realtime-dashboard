import type {
  AssetSymbol,
  CandlestickPoint,
  ChartInterval,
  CoinMarket,
  DashboardMetric,
  MarketDataMode,
  MarketDataResponse,
  MarketPairSymbol,
} from "@crypto-realtime-dashboard/shared-types";
import { useMemo, useState } from "react";
import { CandlestickPanel } from "@/components/dashboard/CandlestickPanel";
import { ConnectionStatusPanel } from "@/components/dashboard/ConnectionStatusPanel";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DeferredTradeHistoryTable } from "@/components/dashboard/DeferredTradeHistoryTable";
import { DisclaimerPanel } from "@/components/dashboard/DisclaimerPanel";
import { MarketWatchPanel } from "@/components/dashboard/MarketWatchPanel";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { createStreamMarketRows } from "@/components/dashboard/marketWatchRows";
import type { MarketRow } from "@/components/dashboard/types";
import { VirtualPortfolioPanel } from "@/components/dashboard/VirtualPortfolioPanel";
import { useCoinMarkets } from "@/hooks/useCoinMarkets";
import { useMarketCandles } from "@/hooks/useMarketCandles";
import { type TickerStreamSource, useMarketTickerStream } from "@/hooks/useMarketTickerStream";
import { useThemePreference } from "@/hooks/useThemePreference";
import { applyLivePriceToLastCandle } from "@/lib/candlestick";
import { createDemoCandlesticks, createDemoTickers } from "@/lib/demoMarketData";

const chartIntervals: readonly ChartInterval[] = ["1m", "5m", "15m", "1h", "1d"];
const selectedChartPair: MarketPairSymbol = "BTC-USD";
const selectedChartAsset: AssetSymbol = "BTC";

export function DashboardPage() {
  const [dataMode, setDataMode] = useState<MarketDataMode>("demo");
  const [streamEnabled, setStreamEnabled] = useState(false);
  const [chartInterval, setChartInterval] = useState<ChartInterval>("1m");
  const { theme, toggleTheme } = useThemePreference();
  const marketsQuery = useCoinMarkets(dataMode === "live");
  const candlesQuery = useMarketCandles(
    selectedChartPair,
    chartInterval,
    dataMode === "live" || streamEnabled,
  );
  const tickerStream = useMarketTickerStream(streamEnabled);
  const restRows = useMemo(
    () =>
      dataMode === "live" && marketsQuery.data !== undefined
        ? marketsQuery.data.data.slice(0, 4).map(createLiveTicker)
        : createDemoTickers(),
    [dataMode, marketsQuery.data],
  );
  const streamBaseRows = useMemo(() => createDemoTickers(), []);
  const streamRows = useMemo(
    () => createStreamMarketRows(streamBaseRows, tickerStream.lastSummary),
    [streamBaseRows, tickerStream.lastSummary],
  );
  const rows = streamEnabled ? streamRows : restRows;
  const chartCandles = useMemo(() => {
    const baseCandles = candlesQuery.data?.data ?? createDemoCandlesticks(selectedChartAsset);
    const latestPrice = streamEnabled
      ? findCoinbaseChartPrice(tickerStream.activeSource, tickerStream.lastSummary?.updates)
      : null;

    return applyLivePriceToLastCandle(baseCandles, latestPrice);
  }, [candlesQuery.data, streamEnabled, tickerStream.activeSource, tickerStream.lastSummary]);
  const activeStreamLabel =
    tickerStream.activeSource === "coinbase"
      ? "Coinbase"
      : tickerStream.activeSource === "binance"
        ? "Binance"
        : "WS";
  const modeLabel = streamEnabled
    ? `WebSocket連携 (${activeStreamLabel})`
    : dataMode === "live"
      ? "REST連携"
      : "デモ";
  const marketStatus = streamEnabled
    ? tickerStream.status === "open"
      ? `${activeStreamLabel}マーケットデータをストリーミング中`
      : tickerStream.status === "error"
        ? "WebSocketを利用できません"
        : "WebSocket中継へ接続中"
    : dataMode === "live"
      ? marketsQuery.isFetching
        ? "公開マーケットデータを取得中"
        : marketsQuery.isError
          ? "公開APIを利用できません"
          : "REST取得データ"
      : "固定データ";
  const chartStatus =
    candlesQuery.isFetching && (dataMode === "live" || streamEnabled)
      ? "Coinbaseローソク足を取得中"
      : candlesQuery.isError || isDemoCandlesFallback(candlesQuery.data, dataMode, streamEnabled)
        ? "Coinbaseローソク足を取得できません"
        : dataMode === "live" || streamEnabled
          ? "Coinbaseローソク足"
          : "デモ用ローソク足";
  const metrics = useMemo<DashboardMetric[]>(
    () => [
      {
        label: "Data Mode",
        value: modeLabel,
        tone: streamEnabled || dataMode === "live" ? "positive" : "neutral",
      },
      {
        label: "WS Relay",
        value: streamEnabled ? `${activeStreamLabel} ${tickerStream.status}` : "Idle",
        tone: tickerStream.status === "open" ? "positive" : "neutral",
      },
      {
        label: "Visible Assets",
        value: String(rows.length),
        tone: "positive",
      },
      {
        label: "Trading",
        value: "Disabled",
        tone: "neutral",
      },
    ],
    [activeStreamLabel, dataMode, modeLabel, rows.length, streamEnabled, tickerStream.status],
  );

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <DashboardHeader
        dataMode={dataMode}
        streamEnabled={streamEnabled}
        theme={theme}
        onSelectDemo={() => {
          setStreamEnabled(false);
          setDataMode("demo");
        }}
        onSelectLiveRest={() => {
          setStreamEnabled(false);
          setDataMode("live");
        }}
        onToggleLiveWs={() => setStreamEnabled((current) => !current)}
        onToggleTheme={toggleTheme}
      />

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
        <section className="min-w-0 space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <MetricCard key={metric.label} metric={metric} />
            ))}
          </div>

          <MarketWatchPanel
            rows={rows}
            marketStatus={marketStatus}
            modeLabel={modeLabel}
            isMarketError={marketsQuery.isError}
            isStreamEnabled={streamEnabled}
            isStreamError={tickerStream.status === "error"}
          />

          <section className="grid gap-6 xl:grid-cols-2">
            <CandlestickPanel
              intervals={chartIntervals}
              selectedInterval={chartInterval}
              chartStatus={chartStatus}
              candles={chartCandles}
              isStreamEnabled={streamEnabled}
              isCandlesError={
                candlesQuery.isError ||
                isDemoCandlesFallback(candlesQuery.data, dataMode, streamEnabled)
              }
              onSelectInterval={setChartInterval}
            />
            <ConnectionStatusPanel
              dataMode={dataMode}
              streamEnabled={streamEnabled}
              activeStreamLabel={activeStreamLabel}
              marketStatus={marketStatus}
              tickerStream={tickerStream}
            />
          </section>

          <DeferredTradeHistoryTable />
        </section>

        <aside className="min-w-0 space-y-6">
          <VirtualPortfolioPanel rows={rows} />
          <DisclaimerPanel />
        </aside>
      </div>
    </main>
  );
}

function isDemoCandlesFallback(
  response: MarketDataResponse<CandlestickPoint[]> | undefined,
  dataMode: MarketDataMode,
  streamEnabled: boolean,
) {
  return (dataMode === "live" || streamEnabled) && response?.source === "demo";
}

function createLiveTicker(market: CoinMarket): MarketRow {
  return {
    symbol: market.symbol.toUpperCase(),
    displayName: market.name,
    priceUsd: market.currentPriceUsd,
    change24hPercent: market.priceChangePercentage24h ?? 0,
    volume24hUsd: market.totalVolumeUsd ?? 0,
    updatedAt: market.lastUpdated ?? "coingecko",
  };
}

export function findCoinbaseChartPrice(
  activeSource: TickerStreamSource | null,
  updates: ReadonlyArray<{ symbol: string; closePriceUsd: number }> | undefined,
) {
  if (activeSource !== "coinbase") {
    return null;
  }

  const update = updates?.find((item) => item.symbol === selectedChartPair);

  return update?.closePriceUsd ?? null;
}
