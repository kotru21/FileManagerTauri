import { waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { useSettingsStore } from "@/features/settings"

// These expected defaults mirror the defaults declared in the settings store
describe("Settings resetSection / resetSettings", () => {
  it("resetSection restores defaults for each top-level section", () => {
    const s = useSettingsStore.getState()

    // Set non-defaults
    s.updateAppearance({ theme: "light", reducedMotion: true })
    s.updateBehavior({ doubleClickToOpen: false })
    s.updateFileDisplay({ dateFormat: "absolute", showFileExtensions: false })
    s.updateLayout({ showToolbar: false })
    s.updatePerformance({ thumbnailCacheSize: 50 })
    s.updateKeyboard({ enableVimMode: true })

    // Reset each section and assert defaults
    s.resetSection("appearance")
    expect(s.settings.appearance.theme).toBe("dark")
    expect(s.settings.appearance.reducedMotion).toBe(false)

    s.resetSection("behavior")
    expect(s.settings.behavior.doubleClickToOpen).toBe(true)

    s.resetSection("fileDisplay")
    expect(s.settings.fileDisplay.dateFormat).toBe("auto")
    expect(s.settings.fileDisplay.showFileExtensions).toBe(true)

    s.resetSection("layout")
    expect(s.settings.layout.showToolbar).toBe(true)

    s.resetSection("performance")
    expect(s.settings.performance.thumbnailCacheSize).toBe(100)

    s.resetSection("keyboard")
    expect(s.settings.keyboard.enableVimMode).toBe(false)
  })

  it("resetSettings restores global defaults", async () => {
    const s = useSettingsStore.getState()

    // Ensure clean environment (clear persisted overrides)
    localStorage.removeItem("app-settings")
    s.resetSettings()

    // Set a non-default then reset all (we don't rely on immediate readback due to persistence timing)
    s.updatePerformance({ thumbnailCacheSize: 30 })

    s.resetSettings()
    await waitFor(() => expect(s.settings.performance.thumbnailCacheSize).toBe(100))
  })
})
