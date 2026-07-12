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
  isKlinesError,
  onSelectInterval,
}: {
  intervals: readonly ChartInterval[];
  selectedInterval: ChartInterval;
  chartStatus: string;
  candles: readonly CandlestickPoint[];
  isStreamEnabled: boolean;
  isKlinesError: boolean;
  onSelectInterval: (interval: ChartInterval) => void;
}) {
  return (
    <Panel title="BTC/USDT Candlestick" icon={<LineChart className="size-5" aria-hidden="true" />}>
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
          {isStreamEnabled ? " / latest tick updates last candle" : ""}
        </p>
      </div>
      <DeferredCandlestickChart candles={candles} />
      {isKlinesError ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
          Binance candlesの取得に失敗しました。Demo candlesで表示を継続しています。
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
