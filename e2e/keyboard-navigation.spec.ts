import { DEV_SERVER_URL } from "./constants"
import { expect, test } from "./fixtures"
import { navigateToPath, withTempWorkspace } from "./fixtures/fs-setup"
import { pressAddressBarShortcut } from "./helpers"

test.describe("Keyboard navigation", () => {
  test("ArrowDown and ArrowUp navigate between file rows", async ({ page }) => {
    await page.goto(DEV_SERVER_URL)

    await withTempWorkspace(page, async (ws) => {
      await navigateToPath(page, ws)

      const rows = page.locator('[data-testid^="file-row-"]')
      await expect(rows).toHaveCount(2)

      await rows.first().click()
      await page.keyboard.press("ArrowDown")

      const scrollTop = await page.evaluate(() => document.documentElement.scrollTop)
      expect(scrollTop).toBe(0)
    })
  })

  test("Home and End jump to first and last rows", async ({ page }) => {
    await page.goto(DEV_SERVER_URL)

    await withTempWorkspace(page, async (ws) => {
      await navigateToPath(page, ws)

      const rows = page.locator('[data-testid^="file-row-"]')
      await expect(rows).toHaveCount(2)

      await rows.first().click()
      await page.keyboard.press("Home")
      await page.keyboard.press("End")
    })
  })

  test("Enter on a directory triggers navigation", async ({ page }) => {
    await page.goto(DEV_SERVER_URL)

    await withTempWorkspace(page, async (ws) => {
      await navigateToPath(page, ws)

      const subdir = page.locator('[data-testid^="file-row-"]').filter({ hasText: "subdir" })
      await subdir.click()
      await page.keyboard.press("Enter")

      await expect(page.getByText("nested.txt")).toBeVisible({ timeout: 10_000 })
    })
  })

  test("keyboard events are ignored inside input elements", async ({ page }) => {
    await page.goto(DEV_SERVER_URL)

    await pressAddressBarShortcut(page)

    const input = page.locator('input[placeholder="Введите путь..."]')
    await expect(input).toBeVisible({ timeout: 2000 })

    await input.fill("/test/path")
    await page.keyboard.press("ArrowDown")

    await expect(input).toHaveValue("/test/path")
  })
})
