import { expect, test } from "@playwright/test"
import { DEV_SERVER_URL } from "./constants"

test("Migrates legacy numeric layout values in localStorage to percent-strings on first load", async ({
  page,
}) => {
  // Put legacy numeric persisted layout into localStorage before app loads
  await page.addInitScript(() => {
    try {
      const key = "layout-storage"
      const payload = {
        state: { layout: { sidebarSize: 15, mainPanelSize: 60, previewPanelSize: 25 } },
      }
      localStorage.setItem(key, JSON.stringify(payload))
    } catch {
      /* ignore */
    }
  })

  await page.goto(DEV_SERVER_URL)
  await page.waitForSelector("text=Недавние", { state: "visible" })

  // After load the persisted storage should be migrated
  const raw = await page.evaluate(() => localStorage.getItem("layout-storage"))
  expect(raw).not.toBeNull()
  const parsed = JSON.parse(raw || "{}")
  expect(parsed?.state?.layout?.sidebarSize).toBe("15%")
  expect(parsed?.state?.layout?.mainPanelSize).toBe("60%")
  expect(parsed?.state?.layout?.previewPanelSize).toBe("25%")
})
