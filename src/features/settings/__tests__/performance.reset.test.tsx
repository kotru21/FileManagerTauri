import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { useSettingsStore } from "@/features/settings"
import { PerformanceSettings } from "@/features/settings/ui/PerformanceSettings"

describe("PerformanceSettings UI", () => {
  it("reset button resets performance section to defaults", async () => {
    // Arrange - set non-default values
    useSettingsStore
      .getState()
      .updatePerformance({ virtualListThreshold: 500, thumbnailCacheSize: 200 })

    // Sanity check before rendering
    expect(useSettingsStore.getState().settings.performance.virtualListThreshold).toBe(500)

    render(<PerformanceSettings />)

    // Click reset
    const btn = screen.getByRole("button", { name: /сбросить/i })
    fireEvent.click(btn)

    // Assert reset to defaults (default virtualListThreshold is 100 per store)
    expect(useSettingsStore.getState().settings.performance.virtualListThreshold).toBe(100)
    expect(useSettingsStore.getState().settings.performance.thumbnailCacheSize).toBe(100)
  })
})
