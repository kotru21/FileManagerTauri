import { DEV_SERVER_URL } from "./constants"
import { expect, test } from "./fixtures"
import { navigateToPath, withTempWorkspace } from "./fixtures/fs-setup"

test("F2 inline rename updates file name", async ({ page }) => {
  await page.goto(DEV_SERVER_URL)

  await withTempWorkspace(page, async (ws) => {
    await navigateToPath(page, ws)

    const row = page.locator('[data-testid^="file-row-"]').filter({ hasText: "sample.txt" })
    await row.click()
    await page.keyboard.press("F2")

    const input = page.locator("input.inline-edit-input, [data-inline-edit] input").first()
    await expect(input).toBeVisible({ timeout: 5000 })
    await input.press("Control+a")
    await input.fill("renamed.txt")
    await input.press("Enter")

    await expect(
      page.locator('[data-testid^="file-row-"]').filter({ hasText: "renamed.txt" }),
    ).toBeVisible({ timeout: 10_000 })
  })
})
