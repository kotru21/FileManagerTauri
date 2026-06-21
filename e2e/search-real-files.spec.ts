import { DEV_SERVER_URL } from "./constants"
import { expect, test } from "./fixtures"
import { navigateToPath, withTempWorkspace } from "./fixtures/fs-setup"
import { openSearchPanel } from "./helpers"

test.describe("Search real files", () => {
  test("name search finds nested.txt", async ({ page }) => {
    await page.goto(DEV_SERVER_URL)

    await withTempWorkspace(page, async (ws) => {
      await navigateToPath(page, ws)
      await openSearchPanel(page)

      const input = page.getByPlaceholder("Поиск файлов...")
      await input.fill("nested")
      await input.press("Enter")

      await expect(page.getByText("nested.txt").first()).toBeVisible({ timeout: 60_000 })
    })
  })
})
