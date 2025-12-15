import { create } from "zustand"
import { persist } from "zustand/middleware"
import { commands } from "@/shared/api/tauri"

interface NavigationState {
  currentPath: string | null
  history: string[]
  historyIndex: number
  navigate: (path: string) => void
  goBack: () => void
  goForward: () => void
  goUp: () => Promise<void>
  canGoBack: () => boolean
  canGoForward: () => boolean
}

export const useNavigationStore = create<NavigationState>()(
  persist(
    (set, get) => ({
      currentPath: null,
      history: [],
      historyIndex: -1,

      navigate: (path: string) => {
        const { currentPath, history, historyIndex } = get()

        // Don't navigate to the same path
        if (currentPath === path) {
          return
        }

        // Truncate forward history if navigating from middle
        const newHistory = history.slice(0, historyIndex + 1)
        newHistory.push(path)

        set({
          currentPath: path,
          history: newHistory,
          historyIndex: newHistory.length - 1,
        })
      },

      goBack: () => {
        const { history, historyIndex } = get()
        if (historyIndex > 0) {
          const newIndex = historyIndex - 1
          set({
            currentPath: history[newIndex],
            historyIndex: newIndex,
          })
        }
      },

      goForward: () => {
        const { history, historyIndex } = get()
        if (historyIndex < history.length - 1) {
          const newIndex = historyIndex + 1
          set({
            currentPath: history[newIndex],
            historyIndex: newIndex,
          })
        }
      },

      goUp: async () => {
        const { currentPath, navigate } = get()
        if (!currentPath) return

        try {
          const result = await commands.getParentPath(currentPath)
          if (result.status === "ok" && result.data) {
            navigate(result.data)
          }
        } catch (error) {
          console.error("Failed to navigate up:", error)
        }
      },

      canGoBack: () => {
        return get().historyIndex > 0
      },

      canGoForward: () => {
        const { history, historyIndex } = get()
        return historyIndex < history.length - 1
      },
    }),
    {
      name: "navigation-storage",
      partialize: (state) => ({
        currentPath: state.currentPath,
        history: state.history,
        historyIndex: state.historyIndex,
      }),
    },
  ),
)
