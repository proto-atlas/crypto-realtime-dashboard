import type { CandlestickPoint, ChartInterval } from "@crypto-realtime-dashboard/shared-types";
import { LineChart } from "lucide-react";
import { lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Panel } from "./Panel";

const CandlestickChart = lazy(() =>
  import("@/components/CandlestickChart").then((module) => ({
    default: module.CandlestickChart,
  })),
);

export function CandlestickPanel({
  intervals,
  selectedInterval,
  chartStatus,
  candles,
  isStreamEnabled,
  isCandlesError,
  onSelectInterval,
}: {
  intervals: readonly ChartInterval[];
  selectedInterval: ChartInterval;
  chartStatus: string;
  candles: readonly CandlestickPoint[];
  isStreamEnabled: boolean;
  isCandlesError: boolean;
  onSelectInterval: (interval: ChartInterval) => void;
}) {
  return (
    <Panel title="BTC/USD ローソク足" icon={<LineChart className="size-5" aria-hidden="true" />}>
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {intervals.map((interval) => (
            <Button
              key={interval}
              type="button"
              size="sm"
              variant={selectedInterval === interval ? "default" : "secondary"}
              onClick={() => onSelectInterval(interval)}
            >
              {interval}
            </Button>
          ))}
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {chartStatus}
          {isStreamEnabled ? " / Coinbase接続中のみ最新価格を反映" : ""}
        </p>
      </div>
      <DeferredCandlestickChart candles={candles} />
      {isCandlesError ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
          Coinbaseローソク足の取得に失敗しました。デモデータで表示を継続しています。
        </p>
      ) : null}
    </Panel>
  );
}

function DeferredCandlestickChart({ candles }: { candles: readonly CandlestickPoint[] }) {
  return (
    <div>
      <Suspense
        fallback={
          <div className="h-[300px] rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950" />
        }
      >
        <CandlestickChart candles={candles} />
      </Suspense>
    </div>
  );
}
