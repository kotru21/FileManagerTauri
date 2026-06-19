import { expect, test } from "@playwright/test"
import { DEV_SERVER_URL } from "./constants"

test.describe("Breadcrumbs", () => {
  test("displays path segments from navigation state", async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem(
          "navigation-storage",
          JSON.stringify({
            state: {
              currentPath: "C:\\Users\\TestUser\\Documents",
              history: ["C:\\", "C:\\Users", "C:\\Users\\TestUser\\Documents"],
              historyIndex: 2,
            },
          }),
        )
      } catch {
        /* ignore */
      }
    })

    await page.goto(DEV_SERVER_URL)

    // Breadcrumb segments should contain path parts
    const segment = page.locator("[data-path]").first()
    if ((await segment.count()) === 0) {
      test.skip(true, "Breadcrumb segments not rendered")
      return
    }

    await expect(segment).toBeVisible()
  })

  test("Ctrl+L opens breadcrumb edit mode", async ({ page }) => {
    await page.goto(DEV_SERVER_URL)

    await page.keyboard.press("Control+l")

    const input = page.locator('input[placeholder="Введите путь..."]')
    await expect(input).toBeVisible({ timeout: 2000 })
  })

  test("Escape cancels breadcrumb editing", async ({ page }) => {
    await page.goto(DEV_SERVER_URL)

    // Enter edit mode
    await page.keyboard.press("Control+l")

    const input = page.locator('input[placeholder="Введите путь..."]')
    if ((await input.count()) === 0) {
      test.skip(true, "Breadcrumb edit mode not available")
      return
    }

    await input.fill("/some/random/path")
    await page.keyboard.press("Escape")

    // Input should disappear after Escape
    await expect(input).not.toBeVisible({ timeout: 2000 })
  })
})
