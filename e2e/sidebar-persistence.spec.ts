import { DEV_SERVER_URL } from "./constants"
import { expect, test } from "./fixtures"
import { navigateToPath, withTempWorkspace } from "./fixtures/fs-setup"

test("Sidebar sections persist collapsed state across reload", async ({ page }) => {
  await page.goto(DEV_SERVER_URL)

  await withTempWorkspace(page, async (ws) => {
    await page.evaluate(() => {
      localStorage.setItem("recent-folders", JSON.stringify({ state: { folders: [] } }))
      // Shared CDP session: ensure recent section starts expanded before we collapse it.
      const key = "layout-storage"
      const raw = localStorage.getItem(key)
      const parsed = raw ? JSON.parse(raw) : { state: { layout: {} } }
      parsed.state ??= {}
      parsed.state.layout ??= {}
      parsed.state.layout.expandedSections = {
        bookmarks: true,
        drives: true,
        quickAccess: true,
        ...parsed.state.layout.expandedSections,
        recent: true,
      }
      localStorage.setItem(key, JSON.stringify(parsed))
    })

    await navigateToPath(page, ws)

    await page.waitForSelector("text=Недавние", { state: "visible" })
    await expect(page.locator('[aria-label^="Open "]')).toHaveCount(1, { timeout: 10_000 })

    const recentHeader = page.locator('[data-slot="section-header"]').filter({ hasText: "Недавние" })
    await recentHeader.click()

    await page.waitForFunction(() => {
      const raw = localStorage.getItem("layout-storage")
      if (!raw) return false
      const parsed = JSON.parse(raw)
      return parsed?.state?.layout?.expandedSections?.recent === false
    })

    await page.reload({ waitUntil: "domcontentloaded" })

    await page.waitForFunction(() => {
      const raw = localStorage.getItem("layout-storage")
      if (!raw) return false
      const parsed = JSON.parse(raw)
      return parsed?.state?.layout?.expandedSections?.recent === false
    })

    await expect(recentHeader).toBeVisible()
    await expect(page.getByRole("button", { name: "Очистить" })).toHaveCount(0)
  })
})
