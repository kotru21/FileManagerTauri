import { test as base, expect } from "@playwright/test"

const CDP_URL = process.env.TAURI_CDP_URL ?? "http://localhost:9222"
const APP_ORIGIN = process.env.DEV_SERVER_URL ?? "http://localhost:1420"

type CdpPageTarget = { id: string; url: string }

async function waitForTauriCdpPage(timeoutMs = 180_000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const version = await fetch(`${CDP_URL}/json/version`)
      if (!version.ok) throw new Error("version not ready")
      const pagesRes = await fetch(`${CDP_URL}/json/list`)
      if (!pagesRes.ok) throw new Error("list not ready")
      const pages = (await pagesRes.json()) as CdpPageTarget[]
      const appPage = pages.find((p) => p.url.startsWith(APP_ORIGIN))
      if (appPage) return
    } catch {
      /* retry until the Tauri webview registers a CDP target */
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error(`Tauri CDP app page not ready at ${CDP_URL}`)
}

export const test = base.extend({
  browser: async ({ playwright }, use) => {
    await waitForTauriCdpPage()
    const browser = await playwright.chromium.connectOverCDP(CDP_URL)
    await use(browser)
  },
  context: async ({ browser }, use) => {
    const context = browser.contexts()[0]
    if (!context) {
      throw new Error("No browser context from Tauri CDP connection")
    }
    await use(context)
  },
  page: async ({ context }, use) => {
    const page =
      context.pages().find((p) => p.url().startsWith(APP_ORIGIN)) ?? context.pages()[0]
    if (!page) {
      throw new Error("No Tauri webview page found via CDP")
    }
    await use(page)
  },
})

export { expect }
