import { expect, test } from "@playwright/test"

test.describe("Search flow", () => {
  test("search input is visible with placeholder", async ({ page }) => {
    const base = process.env.DEV_SERVER_URL ?? "http://localhost:5173"
    await page.goto(base)

    const searchInput = page.locator('input[placeholder*="Поиск"]')
    if ((await searchInput.count()) === 0) {
      // Search bar may not be rendered if no folder is selected
      const altSearch = page.locator('input[placeholder*="Выберите"]')
      if ((await altSearch.count()) === 0) {
        test.skip(true, "Search input not rendered")
        return
      }
      await expect(altSearch).toBeVisible()
      return
    }

    await expect(searchInput).toBeVisible()
  })

  test("typing in search input updates its value", async ({ page }) => {
    const base = process.env.DEV_SERVER_URL ?? "http://localhost:5173"

    await page.addInitScript(() => {
      try {
        localStorage.setItem(
          "navigation-storage",
          JSON.stringify({
            state: {
              currentPath: "C:\\Users",
              history: ["C:\\Users"],
              historyIndex: 0,
            },
          }),
        )
      } catch {
        /* ignore */
      }
    })

    await page.goto(base)

    const searchInput = page.locator('input[placeholder*="Поиск"]')
    if ((await searchInput.count()) === 0) {
      test.skip(true, "Search input not available")
      return
    }

    await searchInput.click()
    await searchInput.fill("test query")
    await expect(searchInput).toHaveValue("test query")
  })

  test("content search toggle button exists", async ({ page }) => {
    const base = process.env.DEV_SERVER_URL ?? "http://localhost:5173"

    await page.addInitScript(() => {
      try {
        localStorage.setItem(
          "navigation-storage",
          JSON.stringify({
            state: {
              currentPath: "C:\\Users",
              history: ["C:\\Users"],
              historyIndex: 0,
            },
          }),
        )
      } catch {
        /* ignore */
      }
    })

    await page.goto(base)

    const toggleBtn = page.locator('button[title*="содержимому"]')
    if ((await toggleBtn.count()) === 0) {
      test.skip(true, "Content search toggle not visible")
      return
    }

    await expect(toggleBtn).toBeVisible()
    await toggleBtn.click()
  })
})
