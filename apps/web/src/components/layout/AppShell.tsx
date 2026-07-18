import { Link, Outlet } from "@tanstack/react-router";
import { ChartCandlestick, History, PieChart } from "lucide-react";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";
import { DataModeControl } from "@/components/layout/DataModeControl";
import { MarketDataProvider } from "@/contexts/MarketDataContext";
import { useThemePreference } from "@/hooks/useThemePreference";
import { cn } from "@/lib/utils";

const navigationItems = [
  { to: "/market", label: "マーケット", icon: ChartCandlestick },
  { to: "/portfolio", label: "仮想ポートフォリオ", icon: PieChart },
  { to: "/history", label: "取引履歴ラボ", icon: History },
] as const;

export function AppShell() {
  const { theme, toggleTheme } = useThemePreference();

  return (
    <MarketDataProvider>
      <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
        <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <div className="mx-auto flex max-w-[1500px] flex-col gap-4 px-4 py-4 sm:px-6 xl:flex-row xl:items-center xl:justify-between xl:px-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-cyan-700 dark:text-cyan-300">
                  Crypto Real-time Dashboard
                </p>
                <p className="mt-1 text-lg font-semibold">公開マーケットデータ監視</p>
              </div>
              <div className="xl:hidden">
                <ThemeToggle theme={theme} onToggleTheme={toggleTheme} />
              </div>
            </div>

            <nav
              className="hidden items-center gap-1 rounded-xl bg-slate-100 p-1 md:flex dark:bg-slate-900"
              aria-label="主要画面"
            >
              {navigationItems.map((item) => (
                <AppNavigationLink key={item.to} {...item} />
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <DataModeControl />
              <div className="hidden xl:block">
                <ThemeToggle theme={theme} onToggleTheme={toggleTheme} />
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1500px] px-4 py-5 pb-24 sm:px-6 md:pb-8 xl:px-8">
          <Outlet />
        </main>

        <nav
          className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-3 border-t border-slate-200 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur md:hidden dark:border-slate-800 dark:bg-slate-950/95"
          aria-label="主要画面"
        >
          {navigationItems.map((item) => (
            <AppNavigationLink key={item.to} {...item} mobile />
          ))}
        </nav>
      </div>
    </MarketDataProvider>
  );
}

function AppNavigationLink({
  to,
  label,
  icon: Icon,
  mobile = false,
}: {
  to: "/market" | "/portfolio" | "/history";
  label: string;
  icon: typeof ChartCandlestick;
  mobile?: boolean;
}) {
  const baseClassName = cn(
    "flex items-center justify-center gap-2 rounded-lg text-sm font-medium text-slate-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:text-slate-300",
    mobile ? "min-h-12 flex-col gap-1 px-1 text-[11px]" : "px-3 py-2",
  );

  return (
    <Link
      to={to}
      className={baseClassName}
      activeProps={{
        className: cn(
          baseClassName,
          "bg-white text-cyan-800 shadow-sm dark:bg-slate-800 dark:text-cyan-200",
        ),
        "aria-current": "page",
      }}
    >
      <Icon className="size-4" aria-hidden="true" />
      <span>{label}</span>
    </Link>
  );
}
