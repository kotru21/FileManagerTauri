import { defineConfig, devices } from "@playwright/test"

const DEV_SERVER_URL = process.env.DEV_SERVER_URL ?? "http://localhost:1420"

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "html",
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
    command: process.env.CI ? "npm run tauri dev" : "npm run dev",
    url: DEV_SERVER_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
