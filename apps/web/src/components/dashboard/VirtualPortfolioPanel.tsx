import { isSupportedAssetSymbol } from "@crypto-realtime-dashboard/shared-types";
import { Activity, RotateCcw, WalletCards } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatPercent, formatUsd } from "@/lib/format";
import { summarizeVirtualPortfolio, type VirtualOrderError } from "@/lib/virtualPortfolio";
import { useVirtualPortfolioStore } from "@/stores/virtualPortfolioStore";
import type { MarketRow } from "./types";

const defaultQuantityInput = "0.1";

export function VirtualPortfolioPanel({ rows }: { rows: readonly MarketRow[] }) {
  const cashUsd = useVirtualPortfolioStore((state) => state.cashUsd);
  const holdings = useVirtualPortfolioStore((state) => state.holdings);
  const transactions = useVirtualPortfolioStore((state) => state.transactions);
  const placeVirtualOrder = useVirtualPortfolioStore((state) => state.placeVirtualOrder);
  const resetVirtualPortfolio = useVirtualPortfolioStore((state) => state.resetVirtualPortfolio);
  const [selectedSymbol, setSelectedSymbol] = useState(rows[0]?.symbol ?? "BTC");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [quantityInput, setQuantityInput] = useState(defaultQuantityInput);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const selectedMarket = rows.find((row) => row.symbol === selectedSymbol) ?? rows[0] ?? null;
  const priceBySymbol = useMemo(
    () => new Map(rows.map((row) => [row.symbol, row.priceUsd] as const)),
    [rows],
  );
  const summary = useMemo(
    () =>
      summarizeVirtualPortfolio(
        {
          cashUsd,
          holdings,
          transactions,
        },
        priceBySymbol,
      ),
    [cashUsd, holdings, priceBySymbol, transactions],
  );
  const quantity = Number(quantityInput);
  const previewUsd =
    selectedMarket !== null && Number.isFinite(quantity) && quantity > 0
      ? quantity * selectedMarket.priceUsd
      : 0;
  const actionLabel = side === "buy" ? "追加する" : "減らす";
  const submitTarget =
    selectedMarket !== null && Number.isFinite(quantity) && quantity > 0
      ? `${selectedMarket.symbol}を${quantityInput}`
      : "仮想保有を";
  const submitLabel = `${submitTarget}${actionLabel}`;

  useEffect(() => {
    if (rows.length > 0 && rows.every((row) => row.symbol !== selectedSymbol)) {
      setSelectedSymbol(rows[0].symbol);
    }
  }, [rows, selectedSymbol]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (selectedMarket === null) {
      setMessage({ tone: "error", text: "市場価格がないため仮想ポジションを更新できません。" });
      return;
    }

    const result = placeVirtualOrder({
      symbol: selectedMarket.symbol,
      displayName: selectedMarket.displayName,
      side,
      quantity,
      priceUsd: selectedMarket.priceUsd,
    });

    if (!result.ok) {
      setMessage({ tone: "error", text: getOrderErrorMessage(result.error) });
      return;
    }

    setMessage({
      tone: "success",
      text:
        side === "buy"
          ? `${selectedMarket.symbol}の仮想保有を追加しました。`
          : `${selectedMarket.symbol}の仮想保有を減らしました。`,
    });
    setQuantityInput(defaultQuantityInput);
  }

  function handleSymbolChange(value: string) {
    if (isSupportedAssetSymbol(value)) {
      setSelectedSymbol(value);
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="size-5 text-cyan-700 dark:text-cyan-300" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">
              仮想ポートフォリオ
            </h2>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
            これはUIデモです。入力データは端末内に保存され、実際の注文や送金は行いません。
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            resetVirtualPortfolio();
            setMessage({ tone: "success", text: "仮想ポートフォリオを初期化しました。" });
          }}
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          初期化
        </Button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <PortfolioStat label="合計評価額" value={formatUsd(summary.totalValueUsd)} />
        <PortfolioStat label="仮想現金" value={formatUsd(summary.cashUsd)} />
        <PortfolioStat label="保有評価額" value={formatUsd(summary.holdingsValueUsd)} />
        <PortfolioStat
          label="含み損益"
          value={formatUsd(summary.unrealizedPnlUsd)}
          tone={
            summary.unrealizedPnlUsd > 0
              ? "positive"
              : summary.unrealizedPnlUsd < 0
                ? "negative"
                : "neutral"
          }
        />
      </div>

      <form className="mt-5 grid gap-3" onSubmit={handleSubmit}>
        <div className="grid gap-3">
          <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-300">
            銘柄
            <select
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              value={selectedMarket?.symbol ?? selectedSymbol}
              onChange={(event) => handleSymbolChange(event.target.value)}
            >
              {rows.map((row) => (
                <option key={row.symbol} value={row.symbol}>
                  {row.symbol} / {row.displayName}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-300">
            数量
            <input
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              inputMode="decimal"
              min="0"
              step="0.0001"
              type="number"
              value={quantityInput}
              onChange={(event) => setQuantityInput(event.target.value)}
            />
          </label>
        </div>

        <div className="grid gap-2">
          <fieldset>
            <legend className="text-sm font-medium text-slate-700 dark:text-slate-300">操作</legend>
            <div className="mt-2 flex items-center gap-2">
              <Button
                type="button"
                variant={side === "buy" ? "default" : "secondary"}
                size="sm"
                aria-pressed={side === "buy"}
                onClick={() => setSide("buy")}
              >
                追加
              </Button>
              <Button
                type="button"
                variant={side === "sell" ? "default" : "secondary"}
                size="sm"
                aria-pressed={side === "sell"}
                onClick={() => setSide("sell")}
              >
                減らす
              </Button>
            </div>
          </fieldset>
          <div className="ml-auto flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <WalletCards className="size-4" aria-hidden="true" />
            想定金額 {formatUsd(previewUsd)}
          </div>
        </div>

        <Button type="submit" disabled={selectedMarket === null}>
          {submitLabel}
        </Button>
      </form>

      {message !== null ? (
        <p
          role="status"
          aria-live="polite"
          className={`mt-3 rounded-lg border px-3 py-2 text-sm ${
            message.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
              : "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100"
          }`}
        >
          {message.text}
        </p>
      ) : null}

      <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
        <h3 className="text-sm font-semibold text-slate-950 dark:text-slate-50">仮想保有</h3>
        <div className="mt-3 grid gap-2">
          {summary.holdings.length === 0 ? (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-400">
              まだ仮想保有はありません。
            </p>
          ) : (
            summary.holdings.map((holding) => (
              <div
                key={holding.symbol}
                className="grid gap-1 rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-950"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-slate-950 dark:text-slate-50">
                    {holding.symbol}
                  </span>
                  <span>{formatUsd(holding.marketValueUsd)}</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-slate-600 dark:text-slate-400">
                  <span>{holding.quantity.toFixed(4)} 単位</span>
                  <span>
                    {formatPercent((holding.unrealizedPnlUsd / holding.costBasisUsd) * 100)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-950 dark:text-slate-50">
            直近の仮想更新
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            保有比率 {summary.exposurePercent.toFixed(2)}%
          </span>
        </div>
        <div className="mt-3 grid gap-2">
          {transactions.slice(0, 3).map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-950"
            >
              <span className="font-medium text-slate-950 dark:text-slate-50">
                {transaction.symbol}を{transaction.side === "buy" ? "追加" : "減算"}
              </span>
              <span className="text-slate-600 dark:text-slate-400">
                {formatUsd(transaction.totalUsd)}
              </span>
            </div>
          ))}
          {transactions.length === 0 ? (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-400">
              仮想更新履歴はまだありません。
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function PortfolioStat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative" | "neutral";
}) {
  const toneClassName =
    tone === "positive"
      ? "text-emerald-700 dark:text-emerald-300"
      : tone === "negative"
        ? "text-rose-700 dark:text-rose-300"
        : "text-slate-950 dark:text-slate-50";

  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-950">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-1 font-semibold ${toneClassName}`}>{value}</p>
    </div>
  );
}

function getOrderErrorMessage(error: VirtualOrderError) {
  switch (error) {
    case "invalid_quantity":
      return "数量は0より大きい数値で入力してください。";
    case "invalid_price":
      return "市場価格がないため仮想ポジションを更新できません。";
    case "insufficient_cash":
      return "仮想現金が不足しています。";
    case "insufficient_holding":
      return "仮想保有数量が不足しています。";
  }
}
