import { TradeHistoryTable } from "@/components/TradeHistoryTable";

export function HistoryPage() {
  return (
    <div>
      <header className="mb-5">
        <p className="text-sm font-medium text-cyan-700 dark:text-cyan-300">大規模テーブル検証</p>
        <h1 className="mt-1 text-2xl font-semibold">取引履歴ラボ</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          10万件の仮想データを検索・並べ替えし、仮想スクロールの動作を確認します。
        </p>
      </header>
      <TradeHistoryTable />
    </div>
  );
}
