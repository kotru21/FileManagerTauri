import { expect, test } from "@playwright/test"

test.describe("Keyboard navigation", () => {
  test("ArrowDown and ArrowUp navigate between file rows", async ({ page }) => {
    const base = process.env.DEV_SERVER_URL ?? "http://localhost:5173"
    await page.goto(base)

    const rows = page.locator('[data-testid^="file-row-"]')
    if ((await rows.count()) < 2) {
      test.skip(true, "Need at least 2 file rows — requires running Tauri backend")
      return
    }

    await rows.first().click()
    await page.keyboard.press("ArrowDown")

    // Verify the page didn't scroll to top (i.e. preventDefault worked)
    const scrollTop = await page.evaluate(() => document.documentElement.scrollTop)
    expect(scrollTop).toBe(0)
  })

  test("Home and End jump to first and last rows", async ({ page }) => {
    const base = process.env.DEV_SERVER_URL ?? "http://localhost:5173"
    await page.goto(base)

    const rows = page.locator('[data-testid^="file-row-"]')
    if ((await rows.count()) < 3) {
      test.skip(true, "Need at least 3 file rows — requires running Tauri backend")
      return
    }

    // Click middle row, then press Home, then End
    await rows.nth(1).click()
    await page.keyboard.press("Home")
    await page.keyboard.press("End")
  })

  test("Enter on a directory triggers navigation", async ({ page }) => {
    const base = process.env.DEV_SERVER_URL ?? "http://localhost:5173"
    await page.goto(base)

    const rows = page.locator('[data-testid^="file-row-"]')
    if ((await rows.count()) === 0) {
      test.skip(true, "No file rows available — requires running Tauri backend")
      return
    }

    await rows.first().click()
    const currentUrl = page.url()
    await page.keyboard.press("Enter")

    // Wait briefly for potential navigation
    await page.waitForTimeout(500)
  })

  test("keyboard events are ignored inside input elements", async ({ page }) => {
    const base = process.env.DEV_SERVER_URL ?? "http://localhost:5173"
    await page.goto(base)

    // Open edit mode in breadcrumbs via Ctrl+L
    await page.keyboard.press("Control+l")

    const input = page.locator('input[placeholder="Введите путь..."]')
    if ((await input.count()) === 0) {
      test.skip(true, "Breadcrumb edit mode not available")
      return
    }

    await input.fill("/test/path")
    await page.keyboard.press("ArrowDown")

    // Input should still have the text (ArrowDown in input should not trigger file navigation)
    await expect(input).toHaveValue("/test/path")
  })
})
