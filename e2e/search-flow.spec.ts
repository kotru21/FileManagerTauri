import { DEV_SERVER_URL } from "./constants"
import { expect, test } from "./fixtures"
import { navigateToPath, withTempWorkspace } from "./fixtures/fs-setup"

test.describe("Search flow", () => {
  test("search input is visible with placeholder", async ({ page }) => {
    await page.goto(DEV_SERVER_URL)

    await withTempWorkspace(page, async (ws) => {
      await navigateToPath(page, ws)

      const searchInput = page.locator('input[placeholder*="Поиск"]')
      await expect(searchInput).toBeVisible()
    })
  })

  test("typing in search input finds real file", async ({ page }) => {
    await page.goto(DEV_SERVER_URL)

    await withTempWorkspace(page, async (ws) => {
      await navigateToPath(page, ws)

      const searchInput = page.locator('input[placeholder*="Поиск"]')
      await searchInput.fill("sample")
      await searchInput.press("Enter")

      await expect(page.getByText("sample.txt")).toBeVisible({ timeout: 10_000 })
    })
  })

  test("content search toggle button exists", async ({ page }) => {
    await page.goto(DEV_SERVER_URL)

    await withTempWorkspace(page, async (ws) => {
      await navigateToPath(page, ws)

      const toggleBtn = page.locator('button[title*="содержимому"]')
      await expect(toggleBtn).toBeVisible()
      await toggleBtn.click()
    })
  })
})
