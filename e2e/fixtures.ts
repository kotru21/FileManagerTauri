import { test as base, expect } from "@playwright/test"
import { tauriShimScript } from "./tauri-shim"

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(tauriShimScript)
    await use(page)
  },
})

export { expect }
