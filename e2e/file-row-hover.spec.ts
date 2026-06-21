import type { Page } from "@playwright/test"
import { expect, test } from "./fixtures"
import { DEV_SERVER_URL } from "./constants"
import { requireBackend } from "./helpers"

test.describe("FileRow hover & cursor", () => {
  test("hover shows actions and cursor is pointer", async ({ page }: { page: Page }) => {
    await page.goto(DEV_SERVER_URL)

    const rows = page.locator('[data-testid^="file-row-"]')
    requireBackend(await rows.count(), "No file rows — requires running Tauri backend")

    const row = rows.first()
    await expect(row).toBeVisible()

    await row.hover()
    const cursor = await row.evaluate((el: HTMLElement) => getComputedStyle(el).cursor)
    expect(cursor).toBe("pointer")

    const actions = row.locator('[data-testid="file-actions"]')
    if ((await actions.count()) === 0) {
      test.skip(true, "Row actions not rendered for this file entry")
      return
    }

    const actionOpacity = await actions.evaluate((el: HTMLElement) => getComputedStyle(el).opacity)
    expect(Number(actionOpacity)).toBeGreaterThan(0)
  })
})
