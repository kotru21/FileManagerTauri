import { DEV_SERVER_URL } from "./constants"
import { expect, test } from "./fixtures"
import { navigateToPath, withTempWorkspace } from "./fixtures/fs-setup"

test("Sidebar sections persist collapsed state across reload", async ({ page }) => {
  await page.goto(DEV_SERVER_URL)

  await withTempWorkspace(page, async (ws) => {
    await navigateToPath(page, ws)

    await page.waitForSelector("text=Недавние", { state: "visible" })

    const folderBtn = page.locator('[aria-label^="Open "]').first()
    await expect(folderBtn).toBeVisible({ timeout: 10_000 })

    await page.click("text=Недавние")

    const raw = await page.evaluate(() => localStorage.getItem("layout-storage"))
    expect(raw).not.toBeNull()
    expect(raw).toContain('"expandedSections"')
    expect(raw).toContain('"recent":false')
    const parsed = JSON.parse(raw || "{}")
    expect(parsed?.state?.layout?.expandedSections?.recent).toBe(false)

    await page.reload()
    await page.waitForSelector("text=Недавние", { state: "visible" })

    const raw2 = await page.evaluate(() => localStorage.getItem("layout-storage"))
    expect(raw2?.includes('"recent":false')).toBe(true)
    await page.waitForTimeout(100)
    expect(await page.locator('[aria-label^="Open "]').count()).toBe(0)
  })
})
