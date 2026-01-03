import { act } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { getPresetLayout } from "../layoutPresets"
import { useSettingsStore } from "../store"

describe("useSettingsStore", () => {
  beforeEach(async () => {
    try {
      localStorage.removeItem("app-settings")
    } catch {
      void 0
    }

    await useSettingsStore.persist?.clearStorage?.()

    act(() => {
      useSettingsStore.setState({ isOpen: false, activeTab: "appearance" })
      useSettingsStore.getState().resetSettings()
    })
  })

  it("open/close toggle dialog state and setActiveTab updates active tab", () => {
    expect(useSettingsStore.getState().isOpen).toBe(false)

    act(() => {
      useSettingsStore.getState().open()
      useSettingsStore.getState().setActiveTab("layout")
    })

    expect(useSettingsStore.getState().isOpen).toBe(true)
    expect(useSettingsStore.getState().activeTab).toBe("layout")

    act(() => {
      useSettingsStore.getState().close()
    })

    expect(useSettingsStore.getState().isOpen).toBe(false)
  })

  it("toggleHiddenFiles flips fileDisplay.showHiddenFiles", () => {
    const before = useSettingsStore.getState().settings.fileDisplay.showHiddenFiles

    act(() => {
      useSettingsStore.getState().toggleHiddenFiles()
    })

    const after = useSettingsStore.getState().settings.fileDisplay.showHiddenFiles
    expect(after).toBe(!before)
  })

  it("setLayoutPreset updates currentPreset and panelLayout", () => {
    act(() => {
      useSettingsStore.getState().setLayoutPreset("compact")
    })

    const s = useSettingsStore.getState().settings.layout
    expect(s.currentPreset).toBe("compact")
    expect(s.panelLayout).toEqual(getPresetLayout("compact"))
  })

  it("updatePanelLayout can mark preset as custom when deviating from preset", () => {
    act(() => {
      useSettingsStore.getState().setLayoutPreset("default")
      useSettingsStore.getState().updatePanelLayout({ sidebarSize: 99 })
    })

    expect(useSettingsStore.getState().settings.layout.currentPreset).toBe("custom")
  })

  it("updateColumnWidths merges widths", () => {
    act(() => {
      useSettingsStore.getState().updateColumnWidths({ size: 123 })
    })

    const w = useSettingsStore.getState().settings.layout.columnWidths
    expect(w.size).toBe(123)
    expect(w.date).toBeTypeOf("number")
    expect(w.padding).toBeTypeOf("number")
  })

  it("saveCustomLayout adds a new custom layout and returns id; applyCustomLayout applies it", () => {
    vi.spyOn(Date, "now").mockReturnValue(100)

    // make layout unique so we can assert it is restored later
    act(() => {
      useSettingsStore.getState().updatePanelLayout({ sidebarSize: 22 })
    })

    let id = ""
    act(() => {
      id = useSettingsStore.getState().saveCustomLayout("My layout")
    })

    expect(typeof id).toBe("string")
    expect(id.length).toBeGreaterThan(0)

    const layouts = useSettingsStore.getState().settings.layout.customLayouts
    expect(layouts).toHaveLength(1)
    expect(layouts[0].id).toBe(id)
    expect(layouts[0].name).toBe("My layout")
    expect(layouts[0].createdAt).toBe(100)

    // change current layout, then apply saved
    act(() => {
      useSettingsStore.getState().updatePanelLayout({ sidebarSize: 77 })
      useSettingsStore.getState().applyCustomLayout(id)
    })

    const after = useSettingsStore.getState().settings.layout
    expect(after.currentPreset).toBe("custom")
    expect(after.panelLayout.sidebarSize).toBe(22)
  })

  it("deleteCustomLayout removes by id", () => {
    let id = ""
    act(() => {
      id = useSettingsStore.getState().saveCustomLayout("L1")
      useSettingsStore.getState().saveCustomLayout("L2")
    })

    expect(useSettingsStore.getState().settings.layout.customLayouts.length).toBe(2)

    act(() => {
      useSettingsStore.getState().deleteCustomLayout(id)
    })

    const layouts = useSettingsStore.getState().settings.layout.customLayouts
    expect(layouts).toHaveLength(1)
    expect(layouts[0].id).not.toBe(id)
  })

  it("resetSection resets section to defaults", () => {
    act(() => {
      useSettingsStore.getState().updatePerformance({ debounceDelay: 999 })
    })

    expect(useSettingsStore.getState().settings.performance.debounceDelay).toBe(999)

    act(() => {
      useSettingsStore.getState().resetSection("performance")
    })

    expect(useSettingsStore.getState().settings.performance.debounceDelay).toBe(150)
  })

  it("importSettings returns false on invalid JSON and true on valid partial import", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})

    expect(useSettingsStore.getState().importSettings("not-json")).toBe(false)

    const currentVersion = useSettingsStore.getState().settings.version

    const ok = useSettingsStore
      .getState()
      .importSettings(JSON.stringify({ version: 0, performance: { debounceDelay: 321 } }))

    expect(ok).toBe(true)
    expect(useSettingsStore.getState().settings.performance.debounceDelay).toBe(321)
    // canonical version should be preserved/normalized
    expect(useSettingsStore.getState().settings.version).toBe(currentVersion)

    expect(warn).toHaveBeenCalled()
  })
})
