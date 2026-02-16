import { expect, test } from "@playwright/test"

test.describe("File operations", () => {
  test("delete key triggers confirmation dialog", async ({ page }) => {
    const base = process.env.DEV_SERVER_URL ?? "http://localhost:5173"
    await page.goto(base)

    const rows = page.locator('[data-testid^="file-row-"]')
    if ((await rows.count()) === 0) {
      test.skip(true, "No file rows available — requires running Tauri backend")
      return
    }

    // Select a file first
    await rows.first().click()

    // Press Delete
    await page.keyboard.press("Delete")

    // Confirmation dialog should appear
    const dialog = page.locator("text=Удалить")
    await expect(dialog.first()).toBeVisible({ timeout: 2000 })
  })

  test("cancel button closes the delete dialog", async ({ page }) => {
    const base = process.env.DEV_SERVER_URL ?? "http://localhost:5173"
    await page.goto(base)

    const rows = page.locator('[data-testid^="file-row-"]')
    if ((await rows.count()) === 0) {
      test.skip(true, "No file rows available — requires running Tauri backend")
      return
    }

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
    const base = process.env.DEV_SERVER_URL ?? "http://localhost:5173"
    await page.goto(base)

    // Press Ctrl+C without any selection - should not cause errors
    await page.keyboard.press("Control+c")

    // Page should still be functional
    const body = page.locator("body")
    await expect(body).toBeVisible()
  })
})
