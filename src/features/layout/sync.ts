import { useSettingsStore } from "@/features/settings"
import type { LayoutSettings } from "@/features/settings/model/types"
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
  // Clamp incoming settings to sensible minimums to avoid zero-width columns
  const clamp = (v: number | undefined, min: number) => Math.max(min, Math.floor(v ?? min))
  useLayoutStore.getState().setColumnWidth("size", clamp(cw.size, 50))
  useLayoutStore.getState().setColumnWidth("date", clamp(cw.date, 80))
  useLayoutStore.getState().setColumnWidth("padding", clamp(cw.padding, 0))

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
      const clamp = (v: number | undefined, min: number) => Math.max(min, Math.floor(v ?? min))
      useLayoutStore.getState().setColumnWidth("size", clamp(newCW.size, 50))
      useLayoutStore.getState().setColumnWidth("date", clamp(newCW.date, 80))
      useLayoutStore.getState().setColumnWidth("padding", clamp(newCW.padding, 0))
    },
  )

  // Subscribe to runtime layout changes and persist into settings (two-way sync)
  // Use a debounce to batch frequent updates (e.g., during column resize)
  let layoutDebounceTimer: ReturnType<typeof setTimeout> | null = null
  let pendingLayoutForSync: PanelLayout | null = null

  const scheduleFlush = () => {
    if (layoutDebounceTimer) clearTimeout(layoutDebounceTimer)
    const delay = useSettingsStore.getState().settings.performance.debounceDelay ?? 150
    layoutDebounceTimer = setTimeout(() => {
      const toSync = pendingLayoutForSync
      pendingLayoutForSync = null
      layoutDebounceTimer = null
      if (!toSync) return

      const settingsPanelNow = useSettingsStore.getState().settings.layout.panelLayout
      const updates: Partial<LayoutSettings> = {}

      // Panel layout fields to compare
      const samePanel =
        settingsPanelNow.showSidebar === toSync.showSidebar &&
        settingsPanelNow.showPreview === toSync.showPreview &&
        settingsPanelNow.sidebarSize === toSync.sidebarSize &&
        settingsPanelNow.previewPanelSize === toSync.previewPanelSize &&
        (settingsPanelNow.sidebarCollapsed ?? false) === (toSync.sidebarCollapsed ?? false)

      if (!samePanel) updates.panelLayout = toSync

      const settingsCW = useSettingsStore.getState().settings.layout.columnWidths
      if (
        settingsCW.size !== toSync.columnWidths.size ||
        settingsCW.date !== toSync.columnWidths.date ||
        settingsCW.padding !== toSync.columnWidths.padding
      ) {
        updates.columnWidths = toSync.columnWidths
      }

      if (Object.keys(updates).length > 0) {
        useSettingsStore.getState().updateLayout(updates)
      }
    }, delay)
  }

  layoutUnsub = useLayoutStore.subscribe(
    (s) => s.layout,
    (newLayout) => {
      if (applyingSettings) return

      // schedule a debounced sync
      pendingLayoutForSync = newLayout
      scheduleFlush()
    },
  )

  return () => {
    settingsUnsub?.()
    columnUnsub?.()
    layoutUnsub?.()
    if (layoutDebounceTimer) {
      clearTimeout(layoutDebounceTimer)
      layoutDebounceTimer = null
      pendingLayoutForSync = null
    }
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
