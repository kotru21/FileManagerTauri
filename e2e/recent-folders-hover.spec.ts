import type { Page } from "@playwright/test"
import { DEV_SERVER_URL } from "./constants"
import { expect, test } from "./fixtures"
import { navigateToPath, withTempWorkspace } from "./fixtures/fs-setup"

test.describe("RecentFolders hover & cursor", () => {
  test("hover shows remove button and cursor is pointer", async ({ page }: { page: Page }) => {
    await page.goto(DEV_SERVER_URL)

    await withTempWorkspace(page, async (ws) => {
      await navigateToPath(page, ws)

      await page.waitForSelector("text=Недавние", { state: "visible" })

      const folder = page.locator('[aria-label^="Open "]').first()
      await expect(folder).toBeVisible({ timeout: 10_000 })

      await folder.hover()
      const cursor = await folder.evaluate((el: HTMLElement) => {
        const row = el.closest(".group") ?? el.parentElement ?? el
        return getComputedStyle(row as HTMLElement).cursor
      })
      expect(cursor).toBe("pointer")

      const aria = await folder.getAttribute("aria-label")
      const name = aria?.replace(/^Open\s*/, "") ?? ""
      const removeBtn = page.locator(`[aria-label="Remove ${name}"]`).first()
      await expect(removeBtn).toBeVisible({ timeout: 5000 })
      await removeBtn.hover()
      const opacity = await removeBtn.evaluate((el: HTMLElement) => getComputedStyle(el).opacity)
      expect(Number(opacity)).toBeGreaterThan(0)
    })
  })
})
