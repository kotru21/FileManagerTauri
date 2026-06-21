import { test } from "@playwright/test"
import type { Page } from "@playwright/test"

export function requireBackend(rowsCount: number, reason: string) {
  if (rowsCount > 0) return
  if (process.env.CI) {
    throw new Error(`E2E backend required in CI: ${reason}`)
  }
  test.skip(true, reason)
}

/** Chromium steals Ctrl+L for the address bar; dispatch in-page for breadcrumb tests. */
export async function pressAddressBarShortcut(page: Page) {
  await page.evaluate(() => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", { ctrlKey: true, code: "KeyL", bubbles: true }),
    )
  })
}

