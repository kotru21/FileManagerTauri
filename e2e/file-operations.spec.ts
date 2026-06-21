import { DEV_SERVER_URL } from "./constants"
import { expect, test } from "./fixtures"
import { navigateToPath, withTempWorkspace } from "./fixtures/fs-setup"

test.describe("File operations", () => {
  test("delete key triggers confirmation dialog", async ({ page }) => {
    await page.goto(DEV_SERVER_URL)

    await withTempWorkspace(page, async (ws) => {
      await navigateToPath(page, ws)

      const rows = page.locator('[data-testid^="file-row-"]')
      await rows.first().click()
      await page.keyboard.press("Delete")

      await expect(page.locator("text=Удалить").first()).toBeVisible({ timeout: 5000 })
    })
  })

  test("cancel button closes the delete dialog", async ({ page }) => {
    await page.goto(DEV_SERVER_URL)

    await withTempWorkspace(page, async (ws) => {
      await navigateToPath(page, ws)

      const rows = page.locator('[data-testid^="file-row-"]')
      await rows.first().click()
      await page.keyboard.press("Delete")

      const cancelBtn = page.locator("text=Отмена")
      await expect(cancelBtn.first()).toBeVisible({ timeout: 5000 })
      await cancelBtn.first().click()

      await expect(cancelBtn.first()).not.toBeVisible({ timeout: 2000 })
    })
  })

  test("copy shortcut Ctrl+C does not crash without selection", async ({ page }) => {
    await page.goto(DEV_SERVER_URL)

    await withTempWorkspace(page, async (ws) => {
      await navigateToPath(page, ws)

      await page.keyboard.press("Control+c")

      await expect(page.locator("body")).toBeVisible()
    })
  })
})
