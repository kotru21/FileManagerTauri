import type { Page } from "@playwright/test"
import { DEV_SERVER_URL } from "./constants"
import { expect, test } from "./fixtures"
import { navigateToPath, withTempWorkspace } from "./fixtures/fs-setup"

test.describe("FileRow hover & cursor", () => {
  test("hover shows pointer cursor on directory row", async ({ page }: { page: Page }) => {
    await page.goto(DEV_SERVER_URL)

    await withTempWorkspace(page, async (ws) => {
      await navigateToPath(page, ws)

      const row = page.locator('[data-testid^="file-row-"]').filter({ hasText: "subdir" })
      await expect(row).toBeVisible()

      await row.hover()
      const cursor = await row.evaluate((el: HTMLElement) => getComputedStyle(el).cursor)
      expect(cursor).toBe("pointer")
    })
  })
})
