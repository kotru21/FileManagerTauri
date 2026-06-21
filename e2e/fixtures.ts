import { test as base, expect } from "@playwright/test"

const CDP_URL = process.env.TAURI_CDP_URL ?? "http://localhost:9222"

async function waitForCdp(url: string, timeoutMs = 180_000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${url}/json/version`)
      if (res.ok) return
    } catch {
      /* retry until tauri webview exposes CDP */
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error(`Tauri CDP endpoint not ready at ${url}`)
}

export const test = base.extend({
  browser: async ({ playwright }, use) => {
    await waitForCdp(CDP_URL)
    const browser = await playwright.chromium.connectOverCDP(CDP_URL)
    await use(browser)
  },
})

export { expect }
