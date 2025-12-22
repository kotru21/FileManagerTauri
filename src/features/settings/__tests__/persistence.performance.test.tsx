import { waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { useSettingsStore } from "@/features/settings"

describe("Settings persistence", () => {
  it("persists performance settings to localStorage under 'app-settings'", async () => {
    // Ensure clean state
    localStorage.removeItem("app-settings")

    // Update performance setting
    useSettingsStore.getState().updatePerformance({ virtualListThreshold: 77 })

    // Wait for localStorage to contain the updated setting
    await waitFor(() => {
      const raw = localStorage.getItem("app-settings")
      if (!raw) throw new Error("no persisted state yet")
      expect(raw).toContain('"virtualListThreshold":77')
    })
  })
})
