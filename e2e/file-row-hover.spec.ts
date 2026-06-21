import type { Page } from "@playwright/test"
import { DEV_SERVER_URL } from "./constants"
import { expect, test } from "./fixtures"
import { navigateToPath, withTempWorkspace } from "./fixtures/fs-setup"

test.describe("FileRow hover & cursor", () => {
  test("hover shows actions and cursor is pointer", async ({ page }: { page: Page }) => {
    await page.goto(DEV_SERVER_URL)

    await withTempWorkspace(page, async (ws) => {
      await navigateToPath(page, ws)

      const row = page.locator('[data-testid^="file-row-"]').filter({ hasText: "subdir" })
      await expect(row).toBeVisible()

      const cursor = await row.evaluate((el: HTMLElement) => getComputedStyle(el).cursor)
      expect(cursor).toBe("pointer")

      await row.hover()

      const actions = row.locator('[data-testid="file-actions"]')
      await expect(actions).toHaveCount(1)
      const actionOpacity = await actions.evaluate((el: HTMLElement) => getComputedStyle(el).opacity)
      expect(Number(actionOpacity)).toBeGreaterThan(0)
    })
  })
})
