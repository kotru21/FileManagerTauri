import { expect, test } from "@playwright/test"

// NOTE: Use DEV_SERVER_URL or default; ensure dev server and recent folders exist

test("Sidebar sections persist collapsed state across reload", async ({ page }) => {
  const base = process.env.DEV_SERVER_URL ?? "http://localhost:5173"

  // Hydrate recent-folders store for deterministic test data
  await page.addInitScript(() => {
    try {
      const key = "recent-folders"
      const payload = {
        state: { folders: [{ path: "/one", name: "One", lastVisited: Date.now() }] },
      }
      localStorage.setItem(key, JSON.stringify(payload))
    } catch {
      /* ignore */
    }
  })

  await page.goto(base)

  await page.waitForSelector("text=Недавние", { state: "visible" })

  const folderBtn = page.locator('[aria-label^="Open "]').first()
  if ((await folderBtn.count()) === 0) {
    test.skip(true, "No recent items to exercise persistence")
    return
  }

  await page.click("text=Недавние")

  const raw = await page.evaluate(() => localStorage.getItem("layout-storage"))
  expect(raw).not.toBeNull()
  expect(raw).toContain('"expandedSections"')
  expect(raw).toContain('"recent":false')
  const parsed = JSON.parse(raw || "{}")
  expect(parsed?.layout?.expandedSections?.recent).toBe(false)

  await page.reload()
  await page.waitForSelector("text=Недавние", { state: "visible" })

  const raw2 = await page.evaluate(() => localStorage.getItem("layout-storage"))
  if (raw2?.includes('"recent":false')) {
    await page.waitForTimeout(100)
    expect(await page.locator('[aria-label^="Open "]').count()).toBe(0)
  } else {
    throw new Error(`Persisted layout not found after reload: ${String(raw2)}`)
  }
})
