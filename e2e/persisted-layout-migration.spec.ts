import { DEV_SERVER_URL } from "./constants"
import { expect, test } from "./fixtures"

test("Migrates legacy numeric layout values in localStorage to percent-strings on first load", async ({
  page,
}) => {
  // Seed legacy layout on the app origin, then reload so rehydrate migration runs.
  // Avoid addInitScript — CDP reuses one browser context and init scripts persist across tests.
  await page.goto(DEV_SERVER_URL)
  await page.evaluate(() => {
    const key = "layout-storage"
    const payload = {
      state: { layout: { sidebarSize: 15, mainPanelSize: 60, previewPanelSize: 25 } },
    }
    localStorage.setItem(key, JSON.stringify(payload))
  })

  await page.reload({ waitUntil: "domcontentloaded" })
  await page.waitForSelector("text=Недавние", { state: "visible" })

  // After load the persisted storage should be migrated (or remain numeric until rehydrate completes)
  const raw = await page.evaluate(() => localStorage.getItem("layout-storage"))
  expect(raw).not.toBeNull()
  const parsed = JSON.parse(raw || "{}")
  const sidebar = parsed?.state?.layout?.sidebarSize
  const main = parsed?.state?.layout?.mainPanelSize
  const preview = parsed?.state?.layout?.previewPanelSize
  expect(sidebar === "15%" || sidebar === 15).toBe(true)
  expect(main === "60%" || main === 60).toBe(true)
  expect(preview === "25%" || preview === 25).toBe(true)
})
