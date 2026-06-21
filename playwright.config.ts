import { defineConfig, devices } from "@playwright/test"

const DEV_SERVER_URL = process.env.DEV_SERVER_URL ?? "http://localhost:1420"
const isCi = !!process.env.CI

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: !isCi,
  forbidOnly: isCi,
  retries: isCi ? 2 : 0,
  workers: isCi ? 1 : undefined,
  reporter: isCi ? "github" : "html",
  timeout: 60_000,
  use: {
    baseURL: DEV_SERVER_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run tauri dev",
    url: DEV_SERVER_URL,
    reuseExistingServer: !isCi,
    timeout: 180_000,
  },
})
