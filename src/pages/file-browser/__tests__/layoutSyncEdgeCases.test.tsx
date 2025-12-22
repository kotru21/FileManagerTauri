/// <reference types="vitest" />
import { render } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import { useLayoutStore } from "@/features/layout"
import { useSettingsStore } from "@/features/settings"
import { layoutPresets } from "@/features/settings/model/layoutPresets"
import { useSyncLayoutWithSettings } from "@/pages/file-browser/hooks/useSyncLayoutWithSettings"

function TestHarness() {
  useSyncLayoutWithSettings()
  return null
}

describe("Layout sync edge cases", () => {
  beforeEach(() => {
    useSettingsStore.getState().resetSettings()
    useLayoutStore.getState().resetLayout()
  })

  it("applies preset to runtime layout when selecting a preset", () => {
    render(<TestHarness />)
    useSettingsStore.getState().setLayoutPreset("wide")

    const runtime = useLayoutStore.getState().layout
    expect(runtime.sidebarSize).toBe(layoutPresets.wide.layout.sidebarSize)
    expect(runtime.previewPanelSize).toBe(layoutPresets.wide.layout.previewPanelSize)
    expect(runtime.showPreview).toBe(layoutPresets.wide.layout.showPreview)
  })

  it("hides sidebar in runtime when settings toggles showSidebar=false", () => {
    render(<TestHarness />)

    // initially visible
    expect(useLayoutStore.getState().layout.showSidebar).toBe(true)

    useSettingsStore.getState().updatePanelLayout({ showSidebar: false })

    expect(useLayoutStore.getState().layout.showSidebar).toBe(false)
  })

  it("updateColumnWidths updates runtime column widths", () => {
    render(<TestHarness />)

    const newWidths = { size: 130, date: 170, padding: 14 }
    useSettingsStore.getState().updateColumnWidths(newWidths)

    const cw = useLayoutStore.getState().layout.columnWidths
    expect(cw.size).toBe(newWidths.size)
    expect(cw.date).toBe(newWidths.date)
    expect(cw.padding).toBe(newWidths.padding)
  })

  it("preview size lock applies previewPanelSize immediately", () => {
    render(<TestHarness />)

    useSettingsStore.getState().updatePanelLayout({ previewSizeLocked: true, previewPanelSize: 33 })

    expect(useLayoutStore.getState().layout.previewPanelSize).toBe(33)
  })
})
