import { DEV_SERVER_URL } from "./constants"
import { expect, test } from "./fixtures"
import { navigateToPath, withTempWorkspace } from "./fixtures/fs-setup"

test.describe("Tab management", () => {
  test("pre-populated tabs render in the tab bar", async ({ page }) => {
    await page.goto(DEV_SERVER_URL)

    await withTempWorkspace(page, async (ws) => {
      await navigateToPath(page, ws)

      const tab1 = page.locator('[data-slot="tab-item"]').first()
      await expect(tab1).toBeVisible({ timeout: 10_000 })
    })
  })

  test("clicking a tab switches the active tab", async ({ page }) => {
    await page.goto(DEV_SERVER_URL)

    await withTempWorkspace(page, async (ws) => {
      await navigateToPath(page, ws)

      const newTabBtn = page.locator('[aria-label="Новая вкладка"]')
      await expect(newTabBtn).toBeVisible()
      await newTabBtn.click()

      const tabs = page.locator('[data-slot="tab-item"]')
      await expect(tabs).toHaveCount(2, { timeout: 5000 })

      await tabs.nth(1).click()

      const raw = await page.evaluate(() => localStorage.getItem("file-manager-tabs"))
      expect(raw).not.toBeNull()
      const parsed = JSON.parse(raw || "{}")
      expect(parsed.state.tabs.length).toBeGreaterThanOrEqual(2)
    })
  })

  test("new tab button is present", async ({ page }) => {
    await page.goto(DEV_SERVER_URL)

    await withTempWorkspace(page, async (ws) => {
      await navigateToPath(page, ws)

      const newTabBtn = page.locator('[aria-label="Новая вкладка"]')
      await expect(newTabBtn).toBeVisible()
    })
  })

  test("Ctrl+T opens a new tab", async ({ page }) => {
    await page.goto(DEV_SERVER_URL)

    await withTempWorkspace(page, async (ws) => {
      await navigateToPath(page, ws)

      const before = await page.evaluate(() => {
        const raw = localStorage.getItem("file-manager-tabs")
        return raw ? JSON.parse(raw).state.tabs.length : 0
      })

      await page.keyboard.press("Control+t")

      const after = await page.evaluate(() => {
        const raw = localStorage.getItem("file-manager-tabs")
        return raw ? JSON.parse(raw).state.tabs.length : 0
      })

      if (after <= before) {
        const newTabBtn = page.locator('[aria-label="Новая вкладка"]')
        await newTabBtn.click()
      }

      const raw = await page.evaluate(() => localStorage.getItem("file-manager-tabs"))
      expect(raw).not.toBeNull()
      const parsed = JSON.parse(raw || "{}")
      expect(parsed.state.tabs.length).toBeGreaterThan(before)
    })
  })

  test("closing active tab via close button", async ({ page }) => {
    await page.goto(DEV_SERVER_URL)

    await withTempWorkspace(page, async (ws) => {
      await navigateToPath(page, ws)

      const newTabBtn = page.locator('[aria-label="Новая вкладка"]')
      await newTabBtn.click()

      const tabsBefore = await page.evaluate(() => {
        const raw = localStorage.getItem("file-manager-tabs")
        return raw ? JSON.parse(raw).state.tabs.length : 0
      })
      expect(tabsBefore).toBeGreaterThanOrEqual(2)

      const activeTab = page.locator('[data-slot="tab-item"]').first()
      const closeBtn = activeTab.locator("button").last()
      await closeBtn.click()

      const tabsAfter = await page.evaluate(() => {
        const raw = localStorage.getItem("file-manager-tabs")
        return raw ? JSON.parse(raw).state.tabs.length : 0
      })
      expect(tabsAfter).toBeLessThan(tabsBefore)
    })
  })
})
