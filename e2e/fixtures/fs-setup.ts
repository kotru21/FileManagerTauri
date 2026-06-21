import type { Page } from "@playwright/test"
import { expect } from "@playwright/test"

export async function withTempWorkspace(
  page: Page,
  fn: (workspacePath: string) => Promise<void>,
): Promise<void> {
  const workspacePath = await page.evaluate(async () => {
    const tauri = (window as unknown as {
      __TAURI__?: {
        core: { invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown> }
        path: { tempDir: () => Promise<string>; join: (...paths: string[]) => Promise<string> }
      }
    }).__TAURI__
    if (!tauri) {
      throw new Error("Tauri globals unavailable — is webServer running `tauri dev`?")
    }

    const { core, path } = tauri
    const root = await path.tempDir()
    const workspace = await path.join(root, "e2e-workspace")
    await core.invoke("create_directory", { path: workspace })
    await core.invoke("create_file", { path: await path.join(workspace, "sample.txt") })
    await core.invoke("create_directory", { path: await path.join(workspace, "subdir") })
    await core.invoke("create_file", { path: await path.join(workspace, "subdir", "nested.txt") })
    return workspace
  })

  try {
    await fn(workspacePath)
  } finally {
    try {
      await page.evaluate(async (ws) => {
        const tauri = (window as unknown as {
          __TAURI__?: { core: { invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown> } }
        }).__TAURI__
        if (!tauri) return
        try {
          await tauri.core.invoke("delete_entries", { paths: [ws] })
        } catch {
          /* best-effort cleanup */
        }
      }, workspacePath)
    } catch {
      /* page may already be closed */
    }
  }
}

export async function navigateToPath(page: Page, targetPath: string) {
  await page.evaluate((path) => {
    localStorage.setItem(
      "navigation-storage",
      JSON.stringify({
        state: { currentPath: path, history: [path], historyIndex: 0 },
      }),
    )
  }, targetPath)

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await page.reload({ waitUntil: "domcontentloaded", timeout: 30_000 })
      break
    } catch (error) {
      if (attempt === 2) throw error
      await page.waitForTimeout(500)
    }
  }

  await expect(page.locator('[data-testid^="file-row-"]').filter({ hasText: "sample.txt" })).toBeVisible({
    timeout: 15_000,
  })
  await expect(page.locator('[data-testid^="file-row-"]').filter({ hasText: "subdir" })).toBeVisible()
}
