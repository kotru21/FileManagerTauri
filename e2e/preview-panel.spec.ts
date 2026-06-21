import { DEV_SERVER_URL } from "./constants"
import { expect, test } from "./fixtures"
import { navigateToPath, withTempWorkspace } from "./fixtures/fs-setup"

test("selecting file shows preview panel content", async ({ page }) => {
  await page.goto(DEV_SERVER_URL)

  await withTempWorkspace(page, async (ws) => {
    await navigateToPath(page, ws)

    await page.locator('[data-testid^="file-row-"]').filter({ hasText: "sample.txt" }).click()

    await expect(page.locator('[data-testid="preview-panel"]')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/sample\.txt|Тип|Размер/i)).toBeVisible()
  })
})
