/// <reference types="vitest" />
import { beforeEach, describe, expect, it } from "vitest"
import { useLayoutStore } from "@/features/layout"
import { initLayoutSync } from "@/features/layout/sync"
import { useSettingsStore } from "@/features/settings"

describe("layout sync module", () => {
  beforeEach(() => {
    useSettingsStore.getState().resetSettings()
    useLayoutStore.getState().resetLayout()
  })

  it("syncs settings -> runtime on init", () => {
    // change settings first
    useSettingsStore.getState().updatePanelLayout({ sidebarSize: 28 })

    const cleanup = initLayoutSync()

    const runtime = useLayoutStore.getState().layout
    expect(runtime.sidebarSize).toBe(28)

    cleanup()
  })

  it("syncs runtime -> settings on change", async () => {
    const cleanup = initLayoutSync()

    // change runtime
    useLayoutStore.getState().setSidebarSize(29)

    // Wait for debounce window to pass
    await new Promise((r) => setTimeout(r, 220))

    const settings = useSettingsStore.getState().settings.layout.panelLayout
    expect(settings.sidebarSize).toBe(29)

    cleanup()
  })

  it("syncs column widths both ways", async () => {
    const cleanup = initLayoutSync()

    useSettingsStore.getState().updateColumnWidths({ size: 140 })
    expect(useLayoutStore.getState().layout.columnWidths.size).toBe(140)

    useLayoutStore.getState().setColumnWidth("date", 200)

    // Wait for debounce window to pass
    await new Promise((r) => setTimeout(r, 220))

    expect(useSettingsStore.getState().settings.layout.columnWidths.date).toBe(200)

    cleanup()
  })
})
