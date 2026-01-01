import { useSettingsStore } from "@/features/settings"
import { useLayoutStore } from "./model/layoutStore"
import { applyLayoutToPanels } from "./panelController"

let columnUnsub: (() => void) | null = null
let presetUnsub: (() => void) | null = null
let applyingPreset = false

/** Check if settings are currently being applied to avoid feedback loops */
export function isApplyingSettings(): boolean {
  return applyingPreset
}

export function initLayoutSync() {
  // Apply current layout from layoutStore (restored from localStorage)
  const currentLayout = useLayoutStore.getState().layout
  applyLayoutToPanels(currentLayout)

  // Sync column widths from settings (these are still managed in settings)
  const settingsStateInitial = useSettingsStore.getState().settings
  const cw = settingsStateInitial.layout.columnWidths

  const clamp = (v: number | undefined, min: number) => Math.max(min, Math.floor(v ?? min))
  useLayoutStore.getState().setColumnWidth("size", clamp(cw.size, 50))
  useLayoutStore.getState().setColumnWidth("date", clamp(cw.date, 80))
  useLayoutStore.getState().setColumnWidth("padding", clamp(cw.padding, 0))

  // Subscribe to settings.columnWidths changes and apply to runtime
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

  // Subscribe to preset changes (when user selects a preset, apply it to layoutStore)
  presetUnsub = useSettingsStore.subscribe(
    (s) => s.settings.layout.currentPreset,
    (newPreset, oldPreset) => {
      if (newPreset === oldPreset) return
      // When preset changes, apply the panelLayout from settings to layoutStore
      const panelLayout = useSettingsStore.getState().settings.layout.panelLayout
      applyingPreset = true
      try {
        useLayoutStore.getState().applyLayout(panelLayout)
        applyLayoutToPanels(panelLayout)
      } finally {
        applyingPreset = false
      }
    },
  )

  return () => {
    columnUnsub?.()
    presetUnsub?.()
    columnUnsub = null
    presetUnsub = null
  }
}

export function stopLayoutSync() {
  columnUnsub?.()
  presetUnsub?.()
  columnUnsub = null
  presetUnsub = null
}
