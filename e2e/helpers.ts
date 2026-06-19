import { test } from "@playwright/test"

export function requireBackend(rowsCount: number, reason: string) {
  if (rowsCount > 0) return
  if (process.env.CI) {
    throw new Error(`E2E backend required in CI: ${reason}`)
  }
  test.skip(true, reason)
}
