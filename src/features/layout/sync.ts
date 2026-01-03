import { useSettingsStore } from "@/entities/app-settings"
import { useLayoutStore } from "@/entities/layout"
import { applyLayoutToPanels } from "./panelController"

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
    presetUnsub?.()
    presetUnsub = null
  }
}

export function stopLayoutSync() {
  presetUnsub?.()
  presetUnsub = null
}
