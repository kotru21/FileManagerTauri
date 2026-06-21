import type { Page } from "@playwright/test"

/** Chromium steals Ctrl+L for the address bar; dispatch in-page for breadcrumb tests. */
export async function pressAddressBarShortcut(page: Page) {
  await page.evaluate(() => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", { ctrlKey: true, code: "KeyL", bubbles: true }),
    )
  })
}
