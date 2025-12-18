import { useSettingsStore } from "@/features/settings"
import type { PanelLayout } from "./model/layoutStore"
import { useLayoutStore } from "./model/layoutStore"
import { applyLayoutToPanels } from "./panelController"

let applyingSettings = false
let settingsUnsub: (() => void) | null = null
let columnUnsub: (() => void) | null = null
let layoutUnsub: (() => void) | null = null

export function initLayoutSync() {
  // Apply current settings -> runtime
  const settingsPanel = useSettingsStore.getState().settings.layout.panelLayout
  const cw = useSettingsStore.getState().settings.layout.columnWidths

  useLayoutStore.getState().applyLayout(settingsPanel)
  useLayoutStore.getState().setColumnWidth("size", cw.size)
  useLayoutStore.getState().setColumnWidth("date", cw.date)
  useLayoutStore.getState().setColumnWidth("padding", cw.padding)

  // Ensure panels reflect initial collapsed state
  applyLayoutToPanels(settingsPanel)

  // Subscribe to settings.panelLayout changes and apply to runtime
  settingsUnsub = useSettingsStore.subscribe(
    (s) => s.settings.layout.panelLayout,
    (newPanel: PanelLayout, oldPanel: PanelLayout | undefined) => {
      // Basic reference check
      if (newPanel === oldPanel) return
      applyingSettings = true
      try {
        useLayoutStore.getState().applyLayout(newPanel)
        // reflect in panels
        applyLayoutToPanels(newPanel)
      } finally {
        applyingSettings = false
      }
    },
  )

  // Subscribe to settings.columnWidths and apply to runtime
  columnUnsub = useSettingsStore.subscribe(
    (s) => s.settings.layout.columnWidths,
    (newCW, oldCW) => {
      if (newCW === oldCW) return
      useLayoutStore.getState().setColumnWidth("size", newCW.size)
      useLayoutStore.getState().setColumnWidth("date", newCW.date)
      useLayoutStore.getState().setColumnWidth("padding", newCW.padding)
    },
  )

  // Subscribe to runtime layout changes and persist into settings (two-way sync)
  layoutUnsub = useLayoutStore.subscribe(
    (s) => s.layout,
    (newLayout) => {
      if (applyingSettings) return

      const settingsPanelNow = useSettingsStore.getState().settings.layout.panelLayout

      // Compare relevant fields to avoid churn
      const same =
        settingsPanelNow.showSidebar === newLayout.showSidebar &&
        settingsPanelNow.showPreview === newLayout.showPreview &&
        settingsPanelNow.sidebarSize === newLayout.sidebarSize &&
        settingsPanelNow.previewPanelSize === newLayout.previewPanelSize &&
        (settingsPanelNow.sidebarCollapsed ?? false) === (newLayout.sidebarCollapsed ?? false)

      if (!same) {
        useSettingsStore.getState().updateLayout({ panelLayout: newLayout })
      }

      // Also sync column widths
      const settingsCW = useSettingsStore.getState().settings.layout.columnWidths
      if (
        settingsCW.size !== newLayout.columnWidths.size ||
        settingsCW.date !== newLayout.columnWidths.date ||
        settingsCW.padding !== newLayout.columnWidths.padding
      ) {
        useSettingsStore.getState().updateLayout({ columnWidths: newLayout.columnWidths })
      }
    },
  )

  return () => {
    settingsUnsub?.()
    columnUnsub?.()
    layoutUnsub?.()
    settingsUnsub = null
    layoutUnsub = null
  }
}

export function stopLayoutSync() {
  settingsUnsub?.()
  columnUnsub?.()
  layoutUnsub?.()
  settingsUnsub = null
  layoutUnsub = null
}
