import { type DataMode, useMarketData } from "@/contexts/MarketDataContext";
import { cn } from "@/lib/utils";

const modeOptions = [
  { value: "demo", label: "デモ" },
  { value: "rest", label: "REST" },
  { value: "websocket", label: "WebSocket" },
] as const satisfies readonly { value: DataMode; label: string }[];

export function DataModeControl() {
  const { mode, setMode } = useMarketData();

  return (
    <fieldset className="min-w-0">
      <legend className="sr-only">データモード</legend>
      <div className="grid grid-cols-3 rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-900">
        {modeOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={mode === option.value}
            className={cn(
              "min-h-9 rounded-lg px-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 sm:px-3",
              mode === option.value
                ? "bg-white text-cyan-800 shadow-sm dark:bg-slate-800 dark:text-cyan-200"
                : "text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-slate-100",
            )}
            onClick={() => setMode(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
