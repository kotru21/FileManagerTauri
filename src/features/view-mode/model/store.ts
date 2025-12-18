import { create } from "zustand"
import { persist } from "zustand/middleware"

export type ViewMode = "list" | "grid" | "details"

import { useSettingsStore } from "@/features/settings"

export interface ViewSettings {
  mode: ViewMode
  gridSize: "small" | "medium" | "large"
  // Per-folder settings
  folderSettings: Record<string, { mode?: ViewMode; sortField?: string; sortDirection?: string }>
}

interface ViewModeState {
  settings: ViewSettings
  setViewMode: (mode: ViewMode) => void
  // toggleHidden will delegate to settings store to keep single source of truth
  toggleHidden: () => void
  setGridSize: (size: "small" | "medium" | "large") => void
  setFolderViewMode: (path: string, mode: ViewMode) => void
  getViewModeForFolder: (path: string) => ViewMode
}

const DEFAULT_SETTINGS: ViewSettings = {
  mode: "list",
  gridSize: "medium",
  folderSettings: {},
}

export const useViewModeStore = create<ViewModeState>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,

      setViewMode: (mode: ViewMode) => {
        set((state) => ({
          settings: { ...state.settings, mode },
        }))
      },

      // Toggle hidden files via settings store to avoid a secondary source of truth
      toggleHidden: () => {
        const current = useSettingsStore.getState().settings.fileDisplay.showHiddenFiles
        useSettingsStore.getState().updateFileDisplay({ showHiddenFiles: !current })
      },

      setGridSize: (size: "small" | "medium" | "large") => {
        set((state) => ({
          settings: { ...state.settings, gridSize: size },
        }))
      },

      setFolderViewMode: (path: string, mode: ViewMode) => {
        set((state) => ({
          settings: {
            ...state.settings,
            folderSettings: {
              ...state.settings.folderSettings,
              [path]: { ...state.settings.folderSettings[path], mode },
            },
          },
        }))
      },

      getViewModeForFolder: (path: string) => {
        const state = get()
        return state.settings.folderSettings[path]?.mode || state.settings.mode
      },
    }),
    {
      name: "file-manager-view-mode",
      // Migrate legacy persisted `showHidden` into global settings on rehydrate
      onRehydrateStorage: (state) => (err) => {
        try {
          if (err) return
          const persisted = (state?.settings as Partial<{ showHidden?: boolean }>) ?? null
          if (persisted && typeof persisted.showHidden === "boolean") {
            const s = persisted.showHidden
            // Push to settings store
            useSettingsStore.getState().updateFileDisplay({ showHiddenFiles: s })
          }
        } catch {
          /* ignore */
        }
      },
    },
  ),
)
