import { createRootRoute, createRoute, createRouter, Navigate } from "@tanstack/react-router";
import { lazy, type ReactNode, Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingState } from "@/components/ui/async-state";
import { normalizeMarketSearch } from "@/lib/marketDisplay";

const MarketOverviewPage = lazy(() =>
  import("@/pages/dashboard").then((module) => ({ default: module.DashboardPage })),
);
const PortfolioPage = lazy(() =>
  import("@/pages/portfolio").then((module) => ({ default: module.PortfolioPage })),
);
const HistoryPage = lazy(() =>
  import("@/pages/history").then((module) => ({ default: module.HistoryPage })),
);

const rootRoute = createRootRoute({
  component: AppShell,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => <Navigate to="/market" search={{ asset: "BTC", interval: "1m" }} />,
});

const marketRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/market",
  validateSearch: normalizeMarketSearch,
  component: () => <RouteSuspense component={<MarketOverviewPage />} />,
});

const portfolioRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/portfolio",
  component: () => <RouteSuspense component={<PortfolioPage />} />,
});

const historyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/history",
  component: () => <RouteSuspense component={<HistoryPage />} />,
});

const routeTree = rootRoute.addChildren([indexRoute, marketRoute, portfolioRoute, historyRoute]);

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
});

function RouteSuspense({ component }: { component: ReactNode }) {
  return <Suspense fallback={<LoadingState label="画面を読み込み中" />}>{component}</Suspense>;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
