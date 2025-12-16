import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface Bookmark {
  id: string
  name: string
  path: string
  icon?: string
  color?: string
  order: number
}

interface BookmarksState {
  bookmarks: Bookmark[]
  addBookmark: (path: string, name?: string) => void
  removeBookmark: (id: string) => void
  updateBookmark: (id: string, updates: Partial<Omit<Bookmark, "id">>) => void
  reorderBookmarks: (fromIndex: number, toIndex: number) => void
  isBookmarked: (path: string) => boolean
  getBookmarkByPath: (path: string) => Bookmark | undefined
}

const generateId = () => crypto.randomUUID()

const getNameFromPath = (path: string): string => {
  const parts = path.replace(/[\\/]+$/, "").split(/[\\/]/)
  return parts[parts.length - 1] || path
}

export const useBookmarksStore = create<BookmarksState>()(
  persist(
    (set, get) => ({
      bookmarks: [],

      addBookmark: (path: string, name?: string) => {
        const state = get()
        if (state.isBookmarked(path)) return

        const bookmark: Bookmark = {
          id: generateId(),
          name: name || getNameFromPath(path),
          path,
          order: state.bookmarks.length,
        }

        set((state) => ({
          bookmarks: [...state.bookmarks, bookmark],
        }))
      },

      removeBookmark: (id: string) => {
        set((state) => ({
          bookmarks: state.bookmarks.filter((b) => b.id !== id).map((b, i) => ({ ...b, order: i })),
        }))
      },

      updateBookmark: (id: string, updates: Partial<Omit<Bookmark, "id">>) => {
        set((state) => ({
          bookmarks: state.bookmarks.map((b) => (b.id === id ? { ...b, ...updates } : b)),
        }))
      },

      reorderBookmarks: (fromIndex: number, toIndex: number) => {
        set((state) => {
          const newBookmarks = [...state.bookmarks]
          const [removed] = newBookmarks.splice(fromIndex, 1)
          newBookmarks.splice(toIndex, 0, removed)
          return {
            bookmarks: newBookmarks.map((b, i) => ({ ...b, order: i })),
          }
        })
      },

      isBookmarked: (path: string) => {
        return get().bookmarks.some((b) => b.path === path)
      },

      getBookmarkByPath: (path: string) => {
        return get().bookmarks.find((b) => b.path === path)
      },
    }),
    {
      name: "file-manager-bookmarks",
    },
  ),
)
