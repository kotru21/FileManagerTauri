import type { Page } from "@playwright/test"
import { expect, test } from "@playwright/test"

// NOTE: Use DEV_SERVER_URL or default; requires dev server running

test.describe("FileRow hover & cursor", () => {
  test("hover shows actions and cursor is pointer", async ({ page }: { page: Page }) => {
    const base = process.env.DEV_SERVER_URL ?? "http://localhost:5173"
    await page.goto(base)

    const row = page.locator('[data-testid^="file-row-"]').first()
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
