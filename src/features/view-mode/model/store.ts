import { create } from "zustand"
import { persist } from "zustand/middleware"

export type ViewMode = "list" | "grid" | "details"

import { useSettingsStore } from "@/entities/app-settings"

export interface ViewSettings {
  mode: ViewMode
  gridSize: "small" | "medium" | "large"
  folderSettings: Record<string, { mode?: ViewMode; sortField?: string; sortDirection?: string }>
}

interface ViewModeState {
  settings: ViewSettings
  setViewMode: (mode: ViewMode) => void
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

      toggleHidden: () => {
        useSettingsStore.getState().toggleHiddenFiles()
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
      onRehydrateStorage: (state) => (err) => {
        try {
          if (err) return
          const persisted = (state?.settings as Partial<{ showHidden?: boolean }>) ?? null
          if (persisted && typeof persisted.showHidden === "boolean") {
            const s = persisted.showHidden
            useSettingsStore.setState((state) => ({
              settings: {
                ...state.settings,
                fileDisplay: { ...state.settings.fileDisplay, showHiddenFiles: s },
              },
            }))
          }
        } catch {
          void 0
        }
      },
    },
  ),
)
