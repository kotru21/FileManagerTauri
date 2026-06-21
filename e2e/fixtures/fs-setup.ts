import type { Page } from "@playwright/test"
import { expect } from "@playwright/test"

export async function withTempWorkspace(
  page: Page,
  fn: (workspacePath: string) => Promise<void>,
): Promise<void> {
  const workspacePath = await page.evaluate(async () => {
    const { invoke } = await import("@tauri-apps/api/core")
    const { tempDir, join } = await import("@tauri-apps/api/path")
    const root = await tempDir()
    const workspace = await join(root, "e2e-workspace")
    await invoke("create_directory", { path: workspace })
    await invoke("create_file", { path: await join(workspace, "sample.txt") })
    await invoke("create_directory", { path: await join(workspace, "subdir") })
    await invoke("create_file", { path: await join(workspace, "subdir", "nested.txt") })
    return workspace
  })

  try {
    await fn(workspacePath)
  } finally {
    await page.evaluate(async (ws) => {
      const { invoke } = await import("@tauri-apps/api/core")
      try {
        await invoke("delete_entries", { paths: [ws] })
      } catch {
        /* best-effort cleanup */
      }
    }, workspacePath)
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
  await page.reload()
  await expect(page.locator('[data-testid^="file-row-"]').filter({ hasText: "sample.txt" })).toBeVisible({
    timeout: 15_000,
  })
  await expect(page.locator('[data-testid^="file-row-"]').filter({ hasText: "subdir" })).toBeVisible()
}
