import type { AssetSymbol } from "@crypto-realtime-dashboard/shared-types";
import { type KeyboardEvent, useRef } from "react";
import { ErrorState } from "@/components/ui/async-state";
import { formatPercent, formatUsd } from "@/lib/format";
import { formatDataFreshness, getNextMarketIndex } from "@/lib/marketDisplay";
import { cn } from "@/lib/utils";
import type { MarketRow } from "./types";

export function MarketWatchPanel({
  rows,
  selectedSymbol,
  marketStatus,
  isMarketError,
  isStreamError,
  onSelect,
}: {
  rows: readonly MarketRow[];
  selectedSymbol: AssetSymbol;
  marketStatus: string;
  isMarketError: boolean;
  isStreamError: boolean;
  onSelect: (symbol: AssetSymbol) => void;
}) {
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const direction =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? "next"
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? "previous"
          : null;

    if (direction === null) {
      return;
    }

    event.preventDefault();
    const nextIndex = getNextMarketIndex(index, direction, rows.length);
    const nextRow = rows[nextIndex];
    if (nextRow !== undefined) {
      onSelect(nextRow.symbol);
      optionRefs.current[nextIndex]?.focus();
    }
  }

  return (
    <section className="min-w-0 rounded-panel border border-panel-border bg-surface p-4 shadow-panel">
      <div className="mb-3">
        <h2 className="font-semibold">マーケット一覧</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{marketStatus}</p>
      </div>

      <div
        className="flex snap-x gap-3 overflow-x-auto pb-2 xl:grid xl:overflow-visible xl:pb-0"
        role="listbox"
        aria-label="監視する銘柄"
      >
        {rows.map((ticker, index) => {
          const selected = ticker.symbol === selectedSymbol;
          const positive = ticker.change24hPercent >= 0;

          return (
            <button
              key={ticker.symbol}
              ref={(element) => {
                optionRefs.current[index] = element;
              }}
              type="button"
              role="option"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              className={cn(
                "min-w-[220px] snap-start rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 xl:min-w-0",
                selected
                  ? "border-cyan-500 bg-cyan-50 dark:border-cyan-400 dark:bg-cyan-950/50"
                  : "border-slate-200 bg-white hover:border-cyan-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-cyan-700",
              )}
              onClick={() => onSelect(ticker.symbol)}
              onKeyDown={(event) => handleKeyDown(event, index)}
            >
              <span className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2">
                  <span className="flex size-9 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white dark:bg-cyan-300 dark:text-slate-950">
                    {ticker.symbol.slice(0, 2)}
                  </span>
                  <span>
                    <span className="block font-semibold">{ticker.symbol}</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">
                      {ticker.displayName}
                    </span>
                  </span>
                </span>
                {selected ? (
                  <span className="text-xs font-semibold text-cyan-800 dark:text-cyan-200">
                    選択中
                  </span>
                ) : null}
              </span>
              <span className="mt-3 flex items-end justify-between gap-3">
                <span className="font-semibold tabular-nums">{formatUsd(ticker.priceUsd)}</span>
                <span
                  className={cn(
                    "text-sm font-semibold tabular-nums",
                    positive
                      ? "text-emerald-700 dark:text-emerald-300"
                      : "text-rose-700 dark:text-rose-300",
                  )}
                >
                  {positive ? "▲" : "▼"} {formatPercent(Math.abs(ticker.change24hPercent))}
                </span>
              </span>
              <span className="mt-2 block text-xs text-slate-500 dark:text-slate-400">
                {formatDataFreshness(ticker.updatedAt)}
              </span>
            </button>
          );
        })}
      </div>

      {isMarketError || isStreamError ? (
        <div className="mt-3">
          <ErrorState>
            マーケットデータを取得できません。デモモードへ切り替えると固定データを表示できます。
          </ErrorState>
        </div>
      ) : null}
    </section>
  );
}
