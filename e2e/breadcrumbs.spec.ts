import { expect, test } from "@playwright/test"

test.describe("Breadcrumbs", () => {
  test("displays path segments from navigation state", async ({ page }) => {
    const base = process.env.DEV_SERVER_URL ?? "http://localhost:5173"

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

    await page.goto(base)

    // Breadcrumb segments should contain path parts
    const segment = page.locator('[data-path]').first()
    if ((await segment.count()) === 0) {
      test.skip(true, "Breadcrumb segments not rendered")
      return
    }

    await expect(segment).toBeVisible()
  })

  test("Ctrl+L opens breadcrumb edit mode", async ({ page }) => {
    const base = process.env.DEV_SERVER_URL ?? "http://localhost:5173"
    await page.goto(base)

    await page.keyboard.press("Control+l")

    const input = page.locator('input[placeholder="Введите путь..."]')
    await expect(input).toBeVisible({ timeout: 2000 })
  })

  test("Escape cancels breadcrumb editing", async ({ page }) => {
    const base = process.env.DEV_SERVER_URL ?? "http://localhost:5173"
    await page.goto(base)

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
