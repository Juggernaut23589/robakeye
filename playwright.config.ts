import { defineConfig, devices } from "@playwright/test";

// E2E tests drive a running dev server backed by a LOCAL database (they
// create their own test shopper and touch stock). Start it with:
//   DATABASE_URL=$E2E_DATABASE_URL DIRECT_URL=$E2E_DATABASE_URL npm run dev
// then: E2E_DATABASE_URL=postgresql://localhost:5432/<db> npm run test:e2e
export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [
    // Installed Google Chrome — avoids downloading Playwright's own build.
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel: "chrome" }, testIgnore: /mobile\.spec\.ts/ },
    { name: "mobile", use: { ...devices["Pixel 7"], channel: "chrome" }, testMatch: /mobile\.spec\.ts/ },
  ],
});
