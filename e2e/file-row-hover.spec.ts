import type { Page } from "@playwright/test"
import { expect, test } from "@playwright/test"

// NOTE: This test assumes the dev server is running at http://localhost:5173
// and that the file list page is reachable at '/'.
// Run with: npx playwright test e2e/file-row-hover.spec.ts

test.describe("FileRow hover & cursor", () => {
  test("hover shows actions and cursor is pointer", async ({ page }: { page: Page }) => {
    await page.goto("http://localhost:5173/")

    // Use Locator for assertions and interactions
    const row = page.locator('[data-testid^="file-row-"]').first()
    await expect(row).toBeVisible()

    // Hover row and check cursor computed style
    await row.hover()
    const cursor = await row.evaluate((el: HTMLElement) => getComputedStyle(el).cursor)
    expect(cursor).toBe("pointer")

    // Actions should be visible when hovered (opacity 1)
    const actions = row.locator(".mr-2").first()
    await expect(actions).toBeVisible()
    const actionOpacity = await actions.evaluate((el: HTMLElement) => getComputedStyle(el).opacity)
    expect(Number(actionOpacity)).toBeGreaterThan(0)
  })
})
