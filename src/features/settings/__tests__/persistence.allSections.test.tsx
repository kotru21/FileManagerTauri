import { waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { useSettingsStore } from "@/features/settings"

describe("Settings persistence - all sections", () => {
  it("persists changes from all sections to localStorage under 'app-settings'", async () => {
    // Ensure clean state
    localStorage.removeItem("app-settings")

    // Apply updates across sections
    useSettingsStore.getState().updateAppearance({ theme: "light", reducedMotion: true })
    useSettingsStore.getState().updateBehavior({ doubleClickToOpen: false })
    useSettingsStore
      .getState()
      .updateFileDisplay({ dateFormat: "absolute", showFileExtensions: false })
    useSettingsStore.getState().updateLayout({ showToolbar: false })
    useSettingsStore.getState().updatePerformance({ thumbnailCacheSize: 50 })
    useSettingsStore.getState().updateKeyboard({ enableVimMode: true })

    // Wait for persistence to occur
    await waitFor(() => {
      const raw = localStorage.getItem("app-settings")
      if (!raw) throw new Error("no persisted state yet")
      expect(raw).toContain('"theme":"light"')
      expect(raw).toContain('"reducedMotion":true')
      expect(raw).toContain('"doubleClickToOpen":false')
      expect(raw).toContain('"dateFormat":"absolute"')
      expect(raw).toContain('"showFileExtensions":false')
      expect(raw).toContain('"showToolbar":false')
      expect(raw).toContain('"thumbnailCacheSize":50')
      expect(raw).toContain('"enableVimMode":true')
    })
  })
})
