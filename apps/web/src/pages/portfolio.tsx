import { DisclaimerPanel } from "@/components/dashboard/DisclaimerPanel";
import { VirtualPortfolioPanel } from "@/components/dashboard/VirtualPortfolioPanel";
import { useMarketData } from "@/contexts/MarketDataContext";

export function PortfolioPage() {
  const { rows } = useMarketData();

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div>
        <header className="mb-5">
          <p className="text-sm font-medium text-cyan-700 dark:text-cyan-300">仮想資産管理</p>
          <h1 className="mt-1 text-2xl font-semibold">仮想ポートフォリオ</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            仮想保有の追加・減少と、現在価格に基づく評価額・損益を確認します。
          </p>
        </header>
        <VirtualPortfolioPanel rows={rows} />
      </div>
      <aside className="xl:pt-[104px]">
        <DisclaimerPanel />
      </aside>
    </div>
  );
}
