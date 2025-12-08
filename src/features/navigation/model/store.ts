import { create } from "zustand";
import { persist } from "zustand/middleware";
import { commands } from "@/shared/api/tauri";

interface NavigationState {
  currentPath: string | null;
  history: string[];
  historyIndex: number;

  navigate: (path: string) => void;
  goBack: () => void;
  goForward: () => void;
  goUp: () => Promise<void>;
  canGoBack: () => boolean;
  canGoForward: () => boolean;
}

export const useNavigationStore = create<NavigationState>()(
  persist(
    (set, get) => ({
      currentPath: null,
      history: [],
      historyIndex: -1,

      navigate: (path) => {
        const state = get();
        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(path);

        set({
          currentPath: path,
          history: newHistory,
          historyIndex: newHistory.length - 1,
        });
      },

      goBack: () => {
        const state = get();
        if (state.historyIndex > 0) {
          const newIndex = state.historyIndex - 1;
          set({
            currentPath: state.history[newIndex],
            historyIndex: newIndex,
          });
        }
      },

      goForward: () => {
        const state = get();
        if (state.historyIndex < state.history.length - 1) {
          const newIndex = state.historyIndex + 1;
          set({
            currentPath: state.history[newIndex],
            historyIndex: newIndex,
          });
        }
      },

      goUp: async () => {
        const state = get();
        if (!state.currentPath) return;

        try {
          const result = await commands.getParentPath(state.currentPath);
          if (result.status === "ok" && result.data) {
            get().navigate(result.data);
          }
        } catch (error) {
          console.error("Failed to get parent path:", error);
        }
      },

      canGoBack: () => get().historyIndex > 0,
      canGoForward: () => {
        const state = get();
        return state.historyIndex < state.history.length - 1;
      },
    }),
    {
      name: "navigation-storage",
      partialize: (state) => ({
        currentPath: state.currentPath,
      }),
    }
  )
);
