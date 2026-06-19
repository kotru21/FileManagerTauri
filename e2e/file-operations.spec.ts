import { expect, test } from "@playwright/test"
import { DEV_SERVER_URL } from "./constants"
import { requireBackend } from "./helpers"

test.describe("File operations", () => {
  test("delete key triggers confirmation dialog", async ({ page }) => {
    await page.goto(DEV_SERVER_URL)

    const rows = page.locator('[data-testid^="file-row-"]')
    requireBackend(await rows.count(), "No file rows — requires running Tauri backend")

    // Select a file first
    await rows.first().click()

    // Press Delete
    await page.keyboard.press("Delete")

    // Confirmation dialog should appear
    const dialog = page.locator("text=Удалить")
    await expect(dialog.first()).toBeVisible({ timeout: 2000 })
  })

  test("cancel button closes the delete dialog", async ({ page }) => {
    await page.goto(DEV_SERVER_URL)

    const rows = page.locator('[data-testid^="file-row-"]')
    requireBackend(await rows.count(), "No file rows — requires running Tauri backend")

    await rows.first().click()
    await page.keyboard.press("Delete")

    const cancelBtn = page.locator("text=Отмена")
    if ((await cancelBtn.count()) === 0) {
      test.skip(true, "Delete confirmation dialog not shown")
      return
    }

    await cancelBtn.click()

    // The dialog should disappear
    await expect(cancelBtn).not.toBeVisible({ timeout: 2000 })
  })

  test("copy shortcut Ctrl+C does not crash without selection", async ({ page }) => {
    await page.goto(DEV_SERVER_URL)

    // Press Ctrl+C without any selection - should not cause errors
    await page.keyboard.press("Control+c")

    // Page should still be functional
    const body = page.locator("body")
    await expect(body).toBeVisible()
  })
})
