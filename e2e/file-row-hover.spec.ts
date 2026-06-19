import type { Page } from "@playwright/test"
import { expect, test } from "@playwright/test"
import { DEV_SERVER_URL } from "./constants"
import { requireBackend } from "./helpers"

// NOTE: requires dev server running

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

    const actions = row.locator(".mr-2").first()
    await expect(actions).toBeVisible()
    const actionOpacity = await actions.evaluate((el: HTMLElement) => getComputedStyle(el).opacity)
    expect(Number(actionOpacity)).toBeGreaterThan(0)
  })
})
