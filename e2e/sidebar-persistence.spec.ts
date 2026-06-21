import { DEV_SERVER_URL } from "./constants"
import { expect, test } from "./fixtures"
import { navigateToPath, withTempWorkspace } from "./fixtures/fs-setup"

test("Sidebar sections persist collapsed state across reload", async ({ page }) => {
  await page.goto(DEV_SERVER_URL)

  await withTempWorkspace(page, async (ws) => {
    await page.evaluate(() => {
      localStorage.setItem("recent-folders", JSON.stringify({ state: { folders: [] } }))
    })

    await navigateToPath(page, ws)

    await page.waitForSelector("text=Недавние", { state: "visible" })
    await expect(page.locator('[aria-label^="Open "]')).toHaveCount(1, { timeout: 10_000 })

    await page.click("text=Недавние")

    await page.waitForFunction(() => {
      const raw = localStorage.getItem("layout-storage")
      if (!raw) return false
      const parsed = JSON.parse(raw)
      return parsed?.state?.layout?.expandedSections?.recent === false
    })

    await page.reload({ waitUntil: "domcontentloaded" })
    await page.waitForSelector("text=Недавние", { state: "visible" })

    await expect(page.locator('[aria-label^="Open "]')).toHaveCount(0, { timeout: 10_000 })
  })
})
