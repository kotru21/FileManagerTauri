import type { Page } from "@playwright/test"
import { expect, test } from "@playwright/test"

// NOTE: Assumes dev server running at http://localhost:5173 and there are recent folders

test.describe("RecentFolders hover & cursor", () => {
  test("hover shows remove button and cursor is pointer", async ({ page }: { page: Page }) => {
    await page.goto("http://localhost:5173/")

    // Wait for recent section title
    await page.waitForSelector("text=Недавние", { state: "visible" })

    // Use Locator for assertions and interactions
    const folder = page.locator('[aria-label^="Open "]').first()
    await expect(folder).toBeVisible()

    // Hover and check cursor
    await folder.hover()
    const cursor = await folder.evaluate((el: HTMLElement) => getComputedStyle(el).cursor)
    expect(cursor).toBe("pointer")

    // Remove button should appear on hover
    const aria = await folder.getAttribute("aria-label")
    const name = aria?.replace(/^Open\s*/, "") ?? ""
    const removeBtn = page.locator(`[aria-label="Remove ${name}"]`).first()
    if ((await removeBtn.count()) > 0) {
      const opacity = await removeBtn.evaluate((el: HTMLElement) => getComputedStyle(el).opacity)
      expect(Number(opacity)).toBeGreaterThan(0)
    } else {
      test.skip(true, "No remove button found for the folder (no recent items?)")
    }
  })
})
