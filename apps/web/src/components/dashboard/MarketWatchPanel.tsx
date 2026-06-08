import { ShieldCheck } from "lucide-react";
import { formatCompactUsd, formatPercent, formatUsd } from "@/lib/format";
import type { MarketRow } from "./types";

export function MarketWatchPanel({
  rows,
  marketStatus,
  modeLabel,
  isMarketError,
  isStreamEnabled,
  isStreamError,
}: {
  rows: readonly MarketRow[];
  marketStatus: string;
  modeLabel: string;
  isMarketError: boolean;
  isStreamEnabled: boolean;
  isStreamError: boolean;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
        <div>
          <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">Market Watch</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {marketStatus} / {modeLabel}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          <ShieldCheck className="size-4" aria-hidden="true" />
          実取引なし
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[680px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <th className="py-3 pr-4 font-medium">Asset</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">24h</th>
              <th className="px-4 py-3 font-medium">Volume</th>
              <th className="py-3 pl-4 font-medium">Source</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((ticker) => (
              <MarketWatchRow key={ticker.symbol} ticker={ticker} />
            ))}
          </tbody>
        </table>
      </div>
      {isMarketError ? (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
          REST連携の取得に失敗しました。デモモードに戻すとローカルデータで確認できます。
        </p>
      ) : null}
      {isStreamEnabled && isStreamError ? (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
          WebSocket連携の接続に失敗しました。BFFを起動するか、デモモードへ戻してください。
        </p>
      ) : null}
    </section>
  );
}

function MarketWatchRow({ ticker }: { ticker: MarketRow }) {
  const isPositive = ticker.change24hPercent >= 0;

  return (
    <tr className="border-b border-slate-100 last:border-0 dark:border-slate-800">
      <td className="py-4 pr-4">
        <div className="font-semibold text-slate-950 dark:text-slate-50">{ticker.symbol}</div>
        <div className="text-sm text-slate-500 dark:text-slate-400">{ticker.displayName}</div>
      </td>
      <td className="px-4 py-4 font-medium">{formatUsd(ticker.priceUsd)}</td>
      <td
        className={`px-4 py-4 font-medium ${isPositive ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}
      >
        {formatPercent(ticker.change24hPercent)}
      </td>
      <td className="px-4 py-4">{formatCompactUsd(ticker.volume24hUsd)}</td>
      <td className="py-4 pl-4 text-slate-500 dark:text-slate-400">{ticker.updatedAt}</td>
    </tr>
  );
}
