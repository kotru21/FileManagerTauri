import { create } from "zustand"
import { persist } from "zustand/middleware"

export type ViewMode = "list" | "grid" | "details"

export interface ViewSettings {
  mode: ViewMode
  showHidden: boolean
  gridSize: "small" | "medium" | "large"
  // Per-folder settings
  folderSettings: Record<string, { mode?: ViewMode; sortField?: string; sortDirection?: string }>
}

interface ViewModeState {
  settings: ViewSettings
  setViewMode: (mode: ViewMode) => void
  setShowHidden: (show: boolean) => void
  toggleHidden: () => void
  setGridSize: (size: "small" | "medium" | "large") => void
  setFolderViewMode: (path: string, mode: ViewMode) => void
  getViewModeForFolder: (path: string) => ViewMode
}

const DEFAULT_SETTINGS: ViewSettings = {
  mode: "list",
  showHidden: false,
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

      setShowHidden: (show: boolean) => {
        set((state) => ({
          settings: { ...state.settings, showHidden: show },
        }))
      },

      toggleHidden: () => {
        set((state) => ({
          settings: { ...state.settings, showHidden: !state.settings.showHidden },
        }))
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
    },
  ),
)
