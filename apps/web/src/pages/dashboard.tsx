import type {
  AssetSymbol,
  CandlestickPoint,
  ChartInterval,
  MarketDataResponse,
} from "@crypto-realtime-dashboard/shared-types";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useMemo } from "react";
import { CandlestickPanel } from "@/components/dashboard/CandlestickPanel";
import { LivePrice } from "@/components/dashboard/LivePrice";
import { MarketDetailsPanel } from "@/components/dashboard/MarketDetailsPanel";
import { MarketWatchPanel } from "@/components/dashboard/MarketWatchPanel";
import { EmptyState } from "@/components/ui/async-state";
import { useMarketData } from "@/contexts/MarketDataContext";
import { useMarketCandles } from "@/hooks/useMarketCandles";
import type { TickerStreamSource } from "@/hooks/useMarketTickerStream";
import { applyLivePriceToLastCandle } from "@/lib/candlestick";
import { createDemoCandlesticks } from "@/lib/demoMarketData";
import { toMarketPairSymbol } from "@/lib/marketDisplay";

const chartIntervals: readonly ChartInterval[] = ["1m", "5m", "15m", "1h", "1d"];

export function DashboardPage() {
  const search = useSearch({ from: "/market" });
  const navigate = useNavigate({ from: "/market" });
  const {
    mode,
    rows,
    marketStatus,
    modeLabel,
    activeStreamLabel,
    isMarketError,
    isStreamError,
    tickerStream,
  } = useMarketData();
  const selectedPair = toMarketPairSymbol(search.asset);
  const selectedMarket = rows.find((row) => row.symbol === search.asset) ?? rows[0] ?? null;
  const candlesQuery = useMarketCandles(selectedPair, search.interval, mode !== "demo");
  const chartCandles = useMemo(() => {
    const baseCandles =
      candlesQuery.data?.data ?? createDemoCandlesticks(search.asset, search.interval);
    const latestPrice =
      mode === "websocket"
        ? findSelectedChartPrice(
            tickerStream.activeSource,
            selectedPair,
            tickerStream.lastSummary?.updates,
          )
        : null;

    return applyLivePriceToLastCandle(baseCandles, latestPrice);
  }, [
    candlesQuery.data,
    mode,
    search.asset,
    search.interval,
    selectedPair,
    tickerStream.activeSource,
    tickerStream.lastSummary,
  ]);
  const chartStatus = getChartStatus({
    response: candlesQuery.data,
    isFetching: candlesQuery.isFetching,
    isError: candlesQuery.isError,
    isLive: mode !== "demo",
  });
  const isCandlesError =
    candlesQuery.isError || isDemoCandlesFallback(candlesQuery.data, mode !== "demo");

  function selectAsset(asset: AssetSymbol) {
    void navigate({ search: { ...search, asset }, replace: true });
  }

  function selectInterval(interval: ChartInterval) {
    void navigate({ search: { ...search, interval }, replace: true });
  }

  return (
    <div>
      <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-cyan-700 dark:text-cyan-300">
            リアルタイム市場監視
          </p>
          <h1 className="mt-1 text-2xl font-semibold">マーケット概要</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            銘柄を選択して、価格、ローソク足、データ取得状態を確認します。
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-slate-500 dark:text-slate-400">現在のデータ: </span>
          <span className="font-semibold">{modeLabel}</span>
        </div>
      </header>

      {selectedMarket === null ? (
        <EmptyState
          title="表示できる銘柄がありません"
          description="デモモードへ切り替えるか、マーケットデータの取得状態を確認してください。"
        />
      ) : (
        <div className="grid min-w-0 gap-5 xl:grid-cols-[280px_minmax(0,1fr)_300px] xl:items-start">
          <div className="order-2 min-w-0 xl:order-1">
            <MarketWatchPanel
              rows={rows}
              selectedSymbol={selectedMarket.symbol}
              marketStatus={marketStatus}
              isMarketError={isMarketError}
              isStreamError={isStreamError}
              onSelect={selectAsset}
            />
          </div>

          <section className="order-1 min-w-0 xl:order-2">
            <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {selectedMarket.displayName} / {selectedPair}
                  </p>
                  <LivePrice
                    priceUsd={selectedMarket.priceUsd}
                    label={`${selectedMarket.symbol}の現在価格`}
                  />
                </div>
                <p
                  className={`mt-1 font-semibold tabular-nums ${
                    selectedMarket.change24hPercent >= 0
                      ? "text-emerald-700 dark:text-emerald-300"
                      : "text-rose-700 dark:text-rose-300"
                  }`}
                >
                  {selectedMarket.change24hPercent >= 0 ? "▲" : "▼"}{" "}
                  {Math.abs(selectedMarket.change24hPercent).toFixed(2)}%
                </p>
              </div>
            </div>
            <CandlestickPanel
              title={`${selectedPair.replace("-", "/")} ローソク足`}
              intervals={chartIntervals}
              selectedInterval={search.interval}
              chartStatus={chartStatus}
              candles={chartCandles}
              isStreamEnabled={mode === "websocket"}
              isCandlesError={isCandlesError}
              onSelectInterval={selectInterval}
            />
          </section>

          <aside className="order-3 min-w-0 xl:sticky xl:top-5">
            <MarketDetailsPanel
              market={selectedMarket}
              activeStreamLabel={activeStreamLabel}
              marketStatus={marketStatus}
              streamStatus={tickerStream.status}
              fallbackReason={tickerStream.fallbackReason}
            />
          </aside>
        </div>
      )}
    </div>
  );
}

function isDemoCandlesFallback(
  response: MarketDataResponse<CandlestickPoint[]> | undefined,
  isLive: boolean,
) {
  return isLive && response?.source === "demo";
}

function getChartStatus({
  response,
  isFetching,
  isError,
  isLive,
}: {
  response: MarketDataResponse<CandlestickPoint[]> | undefined;
  isFetching: boolean;
  isError: boolean;
  isLive: boolean;
}) {
  if (!isLive) {
    return "デモ用ローソク足";
  }

  if (isFetching) {
    return "Coinbaseローソク足を取得中";
  }

  return isError || response?.source === "demo"
    ? "Coinbaseローソク足を取得できません"
    : "Coinbaseローソク足";
}

export function findSelectedChartPrice(
  activeSource: TickerStreamSource | null,
  selectedPair: string,
  updates: ReadonlyArray<{ symbol: string; closePriceUsd: number }> | undefined,
) {
  if (activeSource !== "coinbase") {
    return null;
  }

  return updates?.find((item) => item.symbol === selectedPair)?.closePriceUsd ?? null;
}
