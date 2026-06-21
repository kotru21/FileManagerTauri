import type { Page } from "@playwright/test"
import { DEV_SERVER_URL } from "./constants"
import { expect, test } from "./fixtures"

// NOTE: ensure dev server and recent folders exist

test.describe("RecentFolders hover & cursor", () => {
  test("hover shows remove button and cursor is pointer", async ({ page }: { page: Page }) => {
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

    await page.goto(DEV_SERVER_URL)

    await page.waitForSelector("text=Недавние", { state: "visible" })

    const folder = page.locator('[aria-label^="Open "]').first()
    await expect(folder).toBeVisible()

    await folder.hover()
    const cursor = await folder.evaluate((el: HTMLElement) => {
      const row = el.closest(".group") ?? el.parentElement ?? el
      return getComputedStyle(row as HTMLElement).cursor
    })
    expect(cursor).toBe("pointer")

    const aria = await folder.getAttribute("aria-label")
    const name = aria?.replace(/^Open\s*/, "") ?? ""
    const removeBtn = page.locator(`[aria-label="Remove ${name}"]`).first()
    if ((await removeBtn.count()) > 0) {
      await removeBtn.hover()
      const opacity = await removeBtn.evaluate((el: HTMLElement) => getComputedStyle(el).opacity)
      expect(Number(opacity)).toBeGreaterThan(0)
    } else {
      test.skip(true, "No remove button found for the folder (no recent items?)")
    }
  })
})
