import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Tab {
  id: string;
  path: string;
  title: string;
}

interface TabsState {
  tabs: Tab[];
  activeTabId: string | null;

  addTab: (path: string) => string;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTabPath: (id: string, path: string) => void;
  getActiveTab: () => Tab | null;
}

export const useTabsStore = create<TabsState>()(
  persist(
    (set, get) => ({
      tabs: [],
      activeTabId: null,

      addTab: (path: string) => {
        const id = crypto.randomUUID();
        const title = path.split(/[/\\]/).pop() || path;

        set((state) => ({
          tabs: [...state.tabs, { id, path, title }],
          activeTabId: id,
        }));

        return id;
      },

      closeTab: (id: string) => {
        set((state) => {
          const newTabs = state.tabs.filter((t) => t.id !== id);
          const closedIndex = state.tabs.findIndex((t) => t.id === id);

          let newActiveId = state.activeTabId;
          if (state.activeTabId === id) {
            // Выбираем соседнюю вкладку
            if (newTabs.length > 0) {
              const newIndex = Math.min(closedIndex, newTabs.length - 1);
              newActiveId = newTabs[newIndex]?.id ?? null;
            } else {
              newActiveId = null;
            }
          }

          return { tabs: newTabs, activeTabId: newActiveId };
        });
      },

      setActiveTab: (id: string) => {
        set({ activeTabId: id });
      },

      updateTabPath: (id: string, path: string) => {
        const title = path.split(/[/\\]/).pop() || path;
        set((state) => ({
          tabs: state.tabs.map((t) =>
            t.id === id ? { ...t, path, title } : t
          ),
        }));
      },

      getActiveTab: () => {
        const state = get();
        return state.tabs.find((t) => t.id === state.activeTabId) ?? null;
      },
    }),
    { name: "file-manager-tabs" }
  )
);
