import { create, type StateCreator } from "zustand"
import { persist } from "zustand/middleware"
import { toForwardSlashes } from "@/shared/lib"

export interface RecentFolder {
  path: string
  name: string
  lastVisited: number
}

interface RecentFoldersState {
  folders: RecentFolder[]
  maxFolders: number
  addFolder: (path: string) => void
  removeFolder: (path: string) => void
  clearAll: () => void
  getRecent: (count?: number) => RecentFolder[]
}

const getNameFromPath = (path: string): string => {
  const normalized = toForwardSlashes(path).replace(/\/$/, "")
  const parts = normalized.split("/")
  return parts[parts.length - 1] || path
}

export const useRecentFoldersStore = create<RecentFoldersState>(
  persist<RecentFoldersState>(
    (set, get) => ({
      folders: [],
      maxFolders: 20,

      addFolder: (path) =>
        set((state) => {
          // Remove if already exists
          const filtered = state.folders.filter((f) => f.path !== path)

          // Add to front
          const newFolder: RecentFolder = {
            path,
            name: getNameFromPath(path),
            lastVisited: Date.now(),
          }

          return {
            folders: [newFolder, ...filtered].slice(0, state.maxFolders),
          }
        }),

      removeFolder: (path) =>
        set((state) => ({
          folders: state.folders.filter((f) => f.path !== path),
        })),

      clearAll: () => set({ folders: [] }),

      getRecent: (count = 10) => {
        return get().folders.slice(0, count)
      },
    }),
    {
      name: "recent-folders",
    },
  ) as unknown as StateCreator<RecentFoldersState>,
)
