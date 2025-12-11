import { create } from "zustand";
import { persist } from "zustand/middleware";
import { STORAGE_VERSIONS, HOME as HOME_CONST } from "@/shared/config";
import { getBasename } from "@/shared/lib";

export interface HomeItem {
  path: string;
  name: string;
  isDir: boolean;
  pinned: boolean;
  openCount: number;
  lastOpened: number; // timestamp
}

interface HomeState {
  items: Record<string, HomeItem>;
  trackOpen: (path: string, isDir: boolean, name?: string) => void;
  togglePin: (path: string, isDir?: boolean, name?: string) => void;
  removeItem: (path: string) => void;
  getPinned: () => HomeItem[];
  getFrequent: (limit?: number) => HomeItem[];
  getRecent: (limit?: number) => HomeItem[];
}

export const useHomeStore = create<HomeState>()(
  persist(
    (set, get) => ({
      items: {},

      trackOpen: (path, isDir, name) => {
        const state = get();
        const now = Date.now();
        const item = state.items[path];
        if (item) {
          set({
            items: {
              ...state.items,
              [path]: {
                ...item,
                openCount: item.openCount + 1,
                lastOpened: now,
              },
            },
          });
        } else {
          const newItem: HomeItem = {
            path,
            name: name ?? getBasename(path),
            isDir,
            pinned: false,
            openCount: 1,
            lastOpened: now,
          };
          set({ items: { ...state.items, [path]: newItem } });
        }
      },

      togglePin: (path, isDir, name) => {
        console.debug("home: togglePin", { path, isDir, name });
        const state = get();
        const item = state.items[path];
        if (!item) {
          const newItem: HomeItem = {
            path,
            name: name ?? getBasename(path),
            isDir: Boolean(isDir),
            pinned: true,
            openCount: 0,
            lastOpened: Date.now(),
          };
          set({ items: { ...state.items, [path]: newItem } });
          return;
        }
        set({
          items: {
            ...state.items,
            [path]: { ...item, pinned: !item.pinned },
          },
        });
      },

      removeItem: (path) => {
        console.debug("home: removeItem", { path });
        const state = get();
        const newItems = { ...state.items };
        delete newItems[path];
        set({ items: newItems });
      },

      getPinned: () =>
        Object.values(get().items)
          .filter((i) => i.pinned)
          .sort((a, b) => b.lastOpened - a.lastOpened),

      getFrequent: (limit = HOME_CONST.MAX_FREQUENT_ITEMS) =>
        Object.values(get().items)
          .filter((i) => !i.pinned && i.openCount >= HOME_CONST.MIN_OPEN_COUNT)
          .sort((a, b) => b.openCount - a.openCount)
          .slice(0, limit),

      getRecent: (limit = HOME_CONST.MAX_RECENT_ITEMS) =>
        Object.values(get().items)
          .sort((a, b) => b.lastOpened - a.lastOpened)
          .slice(0, limit),
    }),
    {
      name: "home-storage",
      version: STORAGE_VERSIONS.HOME,
      partialize: (state) => ({ items: state.items }),
      migrate: (persistedState) => persistedState as HomeState,
    }
  )
);

export default useHomeStore;
