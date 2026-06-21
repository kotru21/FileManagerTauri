import { DEV_SERVER_URL } from "./constants"
import { expect, test } from "./fixtures"
import { navigateToPath, withTempWorkspace } from "./fixtures/fs-setup"

test.describe("Copy paste", () => {
  test("Ctrl+C Ctrl+V copies file in temp workspace", async ({ page }) => {
    await page.goto(DEV_SERVER_URL)

    await withTempWorkspace(page, async (ws) => {
      await navigateToPath(page, ws)

      const row = page.locator('[data-testid^="file-row-"]').filter({ hasText: "sample.txt" })
      await row.click()
      await page.keyboard.press("Control+c")

      const subdir = page.locator('[data-testid^="file-row-"]').filter({ hasText: "subdir" })
      await subdir.dblclick()
      await expect(page.getByText("nested.txt")).toBeVisible({ timeout: 10_000 })

      await page.keyboard.press("Control+v")

      await expect(
        page.locator('[data-testid^="file-row-"]').filter({ hasText: "sample.txt" }),
      ).toBeVisible({ timeout: 10_000 })
    })
  })
})
