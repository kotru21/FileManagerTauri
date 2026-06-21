import type { Page } from "@playwright/test"
import { expect } from "@playwright/test"

/** Chromium steals Ctrl+L for the address bar; dispatch in-page for breadcrumb tests. */
export async function pressAddressBarShortcut(page: Page) {
  await page.evaluate(() => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", { ctrlKey: true, code: "KeyL", bubbles: true }),
    )
  })
}

/** Search bar is hidden until the toolbar search button is toggled. */
export async function openSearchPanel(page: Page) {
  await page.getByRole("button", { name: "Поиск" }).click()
  await expect(page.getByPlaceholder("Поиск файлов...")).toBeVisible({ timeout: 10_000 })
}
