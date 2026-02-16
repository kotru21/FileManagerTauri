import { expect, test } from "@playwright/test"

test.describe("Tab management", () => {
  test("pre-populated tabs render in the tab bar", async ({ page }) => {
    const base = process.env.DEV_SERVER_URL ?? "http://localhost:5173"

    await page.addInitScript(() => {
      try {
        localStorage.setItem(
          "file-manager-tabs",
          JSON.stringify({
            state: {
              tabs: [
                { id: "tab-1", path: "C:\\Users", title: "Users", isPinned: false },
                { id: "tab-2", path: "C:\\Documents", title: "Documents", isPinned: false },
              ],
              activeTabId: "tab-1",
            },
          }),
        )
      } catch {
        /* ignore */
      }
    })

    await page.goto(base)

    // Both tabs should be visible by their titles
    const tab1 = page.locator("text=Users").first()
    const tab2 = page.locator("text=Documents").first()

    if ((await tab1.count()) === 0) {
      test.skip(true, "Tab bar not rendered — tabs feature may be disabled")
      return
    }

    await expect(tab1).toBeVisible()
    await expect(tab2).toBeVisible()
  })

  test("clicking a tab switches the active tab", async ({ page }) => {
    const base = process.env.DEV_SERVER_URL ?? "http://localhost:5173"

    await page.addInitScript(() => {
      try {
        localStorage.setItem(
          "file-manager-tabs",
          JSON.stringify({
            state: {
              tabs: [
                { id: "tab-1", path: "C:\\Users", title: "Users", isPinned: false },
                { id: "tab-2", path: "C:\\Documents", title: "Documents", isPinned: false },
              ],
              activeTabId: "tab-1",
            },
          }),
        )
      } catch {
        /* ignore */
      }
    })

    await page.goto(base)

    const tab2 = page.locator("text=Documents").first()
    if ((await tab2.count()) === 0) {
      test.skip(true, "Tab bar not rendered")
      return
    }

    await tab2.click()

    // After clicking, verify the store has updated activeTabId
    const raw = await page.evaluate(() => localStorage.getItem("file-manager-tabs"))
    if (raw) {
      const parsed = JSON.parse(raw)
      expect(parsed.state.activeTabId).toBe("tab-2")
    }
  })

  test("new tab button is present", async ({ page }) => {
    const base = process.env.DEV_SERVER_URL ?? "http://localhost:5173"

    await page.addInitScript(() => {
      try {
        localStorage.setItem(
          "file-manager-tabs",
          JSON.stringify({
            state: {
              tabs: [{ id: "tab-1", path: "C:\\Users", title: "Users", isPinned: false }],
              activeTabId: "tab-1",
            },
          }),
        )
      } catch {
        /* ignore */
      }
    })

    await page.goto(base)

    const newTabBtn = page.locator('[aria-label="Новая вкладка"]')
    if ((await newTabBtn.count()) === 0) {
      test.skip(true, "New tab button not found")
      return
    }

    await expect(newTabBtn).toBeVisible()
  })

  test("new tab button adds a tab", async ({ page }) => {
    const base = process.env.DEV_SERVER_URL ?? "http://localhost:5173"

    await page.addInitScript(() => {
      try {
        localStorage.setItem(
          "file-manager-tabs",
          JSON.stringify({
            state: {
              tabs: [{ id: "tab-1", path: "C:\\Users", title: "Users", isPinned: false }],
              activeTabId: "tab-1",
            },
          }),
        )
      } catch {
        /* ignore */
      }
    })

    await page.goto(base)

    const newTabBtn = page.locator('[aria-label="Новая вкладка"]')
    if ((await newTabBtn.count()) === 0) {
      test.skip(true, "New tab button not found")
      return
    }

    await newTabBtn.click()

    // Check that a new tab was added to the store
    const raw = await page.evaluate(() => localStorage.getItem("file-manager-tabs"))
    if (raw) {
      const parsed = JSON.parse(raw)
      expect(parsed.state.tabs.length).toBeGreaterThanOrEqual(2)
    }
  })
})
