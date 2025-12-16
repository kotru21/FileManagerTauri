import { create } from "zustand"
import { persist } from "zustand/middleware"

export type SortField = "name" | "size" | "modified" | "type"
export type SortDirection = "asc" | "desc"

export interface SortConfig {
  field: SortField
  direction: SortDirection
}

interface SortingState {
  sortConfig: SortConfig
  folderSortConfigs: Record<string, SortConfig>
  setSortConfig: (config: SortConfig) => void
  setSortField: (field: SortField) => void
  toggleSortDirection: () => void
  setFolderSortConfig: (path: string, config: SortConfig) => void
  getSortConfigForFolder: (path: string) => SortConfig
}

const DEFAULT_SORT_CONFIG: SortConfig = {
  field: "name",
  direction: "asc",
}

export const useSortingStore = create<SortingState>()(
  persist(
    (set, get) => ({
      sortConfig: DEFAULT_SORT_CONFIG,
      folderSortConfigs: {},

      setSortConfig: (config: SortConfig) => {
        set({ sortConfig: config })
      },

      setSortField: (field: SortField) => {
        set((state) => ({
          sortConfig: {
            field,
            direction:
              state.sortConfig.field === field
                ? state.sortConfig.direction === "asc"
                  ? "desc"
                  : "asc"
                : "asc",
          },
        }))
      },

      toggleSortDirection: () => {
        set((state) => ({
          sortConfig: {
            ...state.sortConfig,
            direction: state.sortConfig.direction === "asc" ? "desc" : "asc",
          },
        }))
      },

      setFolderSortConfig: (path: string, config: SortConfig) => {
        set((state) => ({
          folderSortConfigs: {
            ...state.folderSortConfigs,
            [path]: config,
          },
        }))
      },

      getSortConfigForFolder: (path: string) => {
        const state = get()
        return state.folderSortConfigs[path] || state.sortConfig
      },
    }),
    {
      name: "file-manager-sorting",
    },
  ),
)
