import { formatCompactUsd, formatPercent, formatUsd } from "@/lib/format";
import { formatDataFreshness } from "@/lib/marketDisplay";
import type { MarketRow } from "./types";

export function MarketDetailsPanel({
  market,
  activeStreamLabel,
  marketStatus,
  streamStatus,
  fallbackReason,
}: {
  market: MarketRow;
  activeStreamLabel: string;
  marketStatus: string;
  streamStatus: "idle" | "connecting" | "open" | "closed" | "error";
  fallbackReason: "coinbase_closed" | "coinbase_error" | null;
}) {
  return (
    <section className="rounded-panel border border-panel-border bg-surface p-4 shadow-panel">
      <h2 className="font-semibold">市場詳細</h2>
      <dl className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
        <DetailRow label="現在価格" value={formatUsd(market.priceUsd)} numeric />
        <DetailRow label="24時間変化" value={formatPercent(market.change24hPercent)} numeric />
        <DetailRow label="24時間出来高" value={formatCompactUsd(market.volume24hUsd)} numeric />
        <DetailRow label="最終更新" value={formatDataFreshness(market.updatedAt)} />
        <DetailRow label="データ元" value={market.sourceLabel} />
        <DetailRow label="接続経路" value={activeStreamLabel} />
        <DetailRow label="接続状態" value={getConnectionLabel(streamStatus)} />
      </dl>
      <p className="mt-4 text-xs leading-5 text-slate-500 dark:text-slate-400">{marketStatus}</p>
      {fallbackReason !== null ? (
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-100">
          Coinbase接続を利用できないため、Binance予備経路を使用しています。
        </p>
      ) : null}
    </section>
  );
}

function DetailRow({
  label,
  value,
  numeric = false,
}: {
  label: string;
  value: string;
  numeric?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <dt className="text-sm text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className={`text-right text-sm font-semibold ${numeric ? "tabular-nums" : ""}`}>
        {value}
      </dd>
    </div>
  );
}

function getConnectionLabel(status: "idle" | "connecting" | "open" | "closed" | "error") {
  switch (status) {
    case "idle":
      return "未接続";
    case "connecting":
      return "接続中";
    case "open":
      return "接続済み";
    case "closed":
      return "切断";
    case "error":
      return "接続エラー";
  }
}
