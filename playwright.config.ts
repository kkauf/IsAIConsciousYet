import { defineConfig, devices } from "@playwright/test";

// Smoke tests against a running site: local dev by default, or E2E_BASE_URL (e.g. production).
const baseURL = process.env.E2E_BASE_URL || "http://localhost:4000";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL },
  webServer: process.env.E2E_BASE_URL ? undefined : { command: "npm run start -- -p 4000", url: baseURL, reuseExistingServer: true, timeout: 120_000 },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
