import { defineConfig, devices } from "@playwright/test";

const productionBaseUrl =
  process.env.PRODUCTION_BASE_URL ?? "https://crypto-realtime-dashboard.pages.dev";

export default defineConfig({
  testDir: "./e2e-production",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "dot" : "list",
  use: {
    baseURL: productionBaseUrl,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
