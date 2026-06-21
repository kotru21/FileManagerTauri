import { DEV_SERVER_URL } from "./constants"
import { expect, test } from "./fixtures"
import { navigateToPath, withTempWorkspace } from "./fixtures/fs-setup"
import { pressAddressBarShortcut } from "./helpers"

test.describe("Breadcrumbs", () => {
  test("displays path segments from navigation state", async ({ page }) => {
    await page.goto(DEV_SERVER_URL)

    await withTempWorkspace(page, async (ws) => {
      await navigateToPath(page, ws)

      const segment = page.locator("[data-path]").filter({ hasText: "e2e-workspace" })
      await expect(segment).toBeVisible()
    })
  })

  test("Ctrl+L opens breadcrumb edit mode", async ({ page }) => {
    await page.goto(DEV_SERVER_URL)

    await pressAddressBarShortcut(page)

    const input = page.locator('input[placeholder="Введите путь..."]')
    await expect(input).toBeVisible({ timeout: 2000 })
  })

  test("Escape cancels breadcrumb editing", async ({ page }) => {
    await page.goto(DEV_SERVER_URL)

    await pressAddressBarShortcut(page)

    const input = page.locator('input[placeholder="Введите путь..."]')
    await expect(input).toBeVisible({ timeout: 2000 })

    await input.fill("/some/random/path")
    await page.keyboard.press("Escape")

    await expect(input).not.toBeVisible({ timeout: 2000 })
  })
})
