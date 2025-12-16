import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface Tab {
  id: string
  path: string
  title: string
  isPinned: boolean
}

interface TabsState {
  tabs: Tab[]
  activeTabId: string | null

  // Actions
  addTab: (path: string, title?: string) => string
  closeTab: (id: string) => void
  closeOtherTabs: (id: string) => void
  closeTabsToRight: (id: string) => void
  closeAllTabs: () => void
  setActiveTab: (id: string) => void
  updateTabPath: (id: string, path: string, title?: string) => void
  moveTab: (fromIndex: number, toIndex: number) => void
  duplicateTab: (id: string) => string
  pinTab: (id: string) => void
  unpinTab: (id: string) => void
  getActiveTab: () => Tab | null
  getTabById: (id: string) => Tab | undefined
}

const generateId = () => crypto.randomUUID()

const getPathTitle = (path: string): string => {
  if (!path) return "New Tab"
  const parts = path.replace(/[\\/]+$/, "").split(/[\\/]/)
  return parts[parts.length - 1] || path
}

export const useTabsStore = create<TabsState>()(
  persist(
    (set, get) => ({
      tabs: [],
      activeTabId: null,

      addTab: (path: string, title?: string) => {
        const id = generateId()
        const newTab: Tab = {
          id,
          path,
          title: title || getPathTitle(path),
          isPinned: false,
        }

        set((state) => ({
          tabs: [...state.tabs, newTab],
          activeTabId: id,
        }))

        return id
      },

      closeTab: (id: string) => {
        const state = get()
        const tabIndex = state.tabs.findIndex((t) => t.id === id)
        const tab = state.tabs[tabIndex]

        // Don't close pinned tabs
        if (tab?.isPinned) return

        const newTabs = state.tabs.filter((t) => t.id !== id)

        let newActiveId = state.activeTabId
        if (state.activeTabId === id) {
          // Select adjacent tab
          if (newTabs.length > 0) {
            const newIndex = Math.min(tabIndex, newTabs.length - 1)
            newActiveId = newTabs[newIndex].id
          } else {
            newActiveId = null
          }
        }

        set({ tabs: newTabs, activeTabId: newActiveId })
      },

      closeOtherTabs: (id: string) => {
        set((state) => ({
          tabs: state.tabs.filter((t) => t.id === id || t.isPinned),
          activeTabId: id,
        }))
      },

      closeTabsToRight: (id: string) => {
        set((state) => {
          const index = state.tabs.findIndex((t) => t.id === id)
          return {
            tabs: state.tabs.filter((t, i) => i <= index || t.isPinned),
          }
        })
      },

      closeAllTabs: () => {
        set((state) => ({
          tabs: state.tabs.filter((t) => t.isPinned),
          activeTabId: state.tabs.find((t) => t.isPinned)?.id || null,
        }))
      },

      setActiveTab: (id: string) => {
        set({ activeTabId: id })
      },

      updateTabPath: (id: string, path: string, title?: string) => {
        set((state) => ({
          tabs: state.tabs.map((t) =>
            t.id === id ? { ...t, path, title: title || getPathTitle(path) } : t,
          ),
        }))
      },

      moveTab: (fromIndex: number, toIndex: number) => {
        set((state) => {
          const newTabs = [...state.tabs]
          const [removed] = newTabs.splice(fromIndex, 1)
          newTabs.splice(toIndex, 0, removed)
          return { tabs: newTabs }
        })
      },

      duplicateTab: (id: string) => {
        const tab = get().tabs.find((t) => t.id === id)
        if (!tab) return ""

        const newId = generateId()
        const newTab: Tab = {
          ...tab,
          id: newId,
          isPinned: false,
        }

        set((state) => {
          const index = state.tabs.findIndex((t) => t.id === id)
          const newTabs = [...state.tabs]
          newTabs.splice(index + 1, 0, newTab)
          return { tabs: newTabs, activeTabId: newId }
        })

        return newId
      },

      pinTab: (id: string) => {
        set((state) => {
          const tabs = state.tabs.map((t) => (t.id === id ? { ...t, isPinned: true } : t))
          // Move pinned tabs to the beginning
          const pinned = tabs.filter((t) => t.isPinned)
          const unpinned = tabs.filter((t) => !t.isPinned)
          return { tabs: [...pinned, ...unpinned] }
        })
      },

      unpinTab: (id: string) => {
        set((state) => ({
          tabs: state.tabs.map((t) => (t.id === id ? { ...t, isPinned: false } : t)),
        }))
      },

      getActiveTab: () => {
        const state = get()
        return state.tabs.find((t) => t.id === state.activeTabId) || null
      },

      getTabById: (id: string) => {
        return get().tabs.find((t) => t.id === id)
      },
    }),
    {
      name: "file-manager-tabs",
      partialize: (state) => ({
        tabs: state.tabs,
        activeTabId: state.activeTabId,
      }),
    },
  ),
)
