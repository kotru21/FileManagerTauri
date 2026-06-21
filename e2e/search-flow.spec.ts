import { DEV_SERVER_URL } from "./constants"
import { expect, test } from "./fixtures"
import { navigateToPath, withTempWorkspace } from "./fixtures/fs-setup"
import { openSearchPanel } from "./helpers"

test.describe("Search flow", () => {
  test("search input is visible with placeholder", async ({ page }) => {
    await page.goto(DEV_SERVER_URL)

    await withTempWorkspace(page, async (ws) => {
      await navigateToPath(page, ws)
      await openSearchPanel(page)

      await expect(page.getByPlaceholder("Поиск файлов...")).toBeVisible()
    })
  })

  test("typing in search input finds real file", async ({ page }) => {
    await page.goto(DEV_SERVER_URL)

    await withTempWorkspace(page, async (ws) => {
      await navigateToPath(page, ws)
      await openSearchPanel(page)

      const searchInput = page.getByPlaceholder("Поиск файлов...")
      await searchInput.fill("sample")
      await searchInput.press("Enter")

      await expect(page.getByText("sample.txt").first()).toBeVisible({ timeout: 60_000 })
    })
  })

  test("content search toggle button exists", async ({ page }) => {
    await page.goto(DEV_SERVER_URL)

    await withTempWorkspace(page, async (ws) => {
      await navigateToPath(page, ws)
      await openSearchPanel(page)

      const toggleBtn = page.getByTitle(/Поиск по содержимому/)
      await expect(toggleBtn).toBeVisible()
      await toggleBtn.click()
    })
  })
})
