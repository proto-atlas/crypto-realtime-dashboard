import { createRootRoute, createRoute, createRouter, Outlet } from "@tanstack/react-router";
import { DashboardPage } from "@/pages/dashboard";

const rootRoute = createRootRoute({
  component: RootLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: DashboardPage,
});

const routeTree = rootRoute.addChildren([indexRoute]);

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
});

function RootLayout() {
  return <Outlet />;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
