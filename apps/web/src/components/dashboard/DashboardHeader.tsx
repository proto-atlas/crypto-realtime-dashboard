import type { MarketDataMode } from "@crypto-realtime-dashboard/shared-types";
import { Radio, RefreshCw, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ThemePreference } from "@/lib/theme";
import { ThemeToggle } from "./ThemeToggle";

export function DashboardHeader({
  dataMode,
  streamEnabled,
  onSelectDemo,
  onSelectLiveRest,
  onToggleLiveWs,
  theme,
  onToggleTheme,
}: {
  dataMode: MarketDataMode;
  streamEnabled: boolean;
  onSelectDemo: () => void;
  onSelectLiveRest: () => void;
  onToggleLiveWs: () => void;
  theme: ThemePreference;
  onToggleTheme: () => void;
}) {
  return (
    <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div>
          <p className="text-sm font-medium text-cyan-700 dark:text-cyan-300">
            Crypto Real-time Dashboard
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950 dark:text-slate-50">
            公開マーケットデータ監視UI
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ThemeToggle theme={theme} onToggleTheme={onToggleTheme} />
          <Button
            variant={!streamEnabled && dataMode === "demo" ? "default" : "secondary"}
            size="sm"
            onClick={onSelectDemo}
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            デモモード
          </Button>
          <Button
            variant={!streamEnabled && dataMode === "live" ? "default" : "secondary"}
            size="sm"
            onClick={onSelectLiveRest}
          >
            <Wifi className="size-4" aria-hidden="true" />
            REST連携
          </Button>
          <Button
            variant={streamEnabled ? "default" : "secondary"}
            size="sm"
            onClick={onToggleLiveWs}
          >
            <Radio className="size-4" aria-hidden="true" />
            WebSocket連携
          </Button>
        </div>
      </div>
    </header>
  );
}
