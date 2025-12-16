import { create } from "zustand"

interface QuickFilterState {
  filter: string
  isActive: boolean
  setFilter: (filter: string) => void
  activate: () => void
  deactivate: () => void
  clear: () => void
  toggle: () => void
}

export const useQuickFilterStore = create<QuickFilterState>((set, get) => ({
  filter: "",
  isActive: false,
  setFilter: (filter) => set({ filter }),
  activate: () => set({ isActive: true }),
  deactivate: () => set({ isActive: false, filter: "" }),
  clear: () => set({ filter: "" }),
  toggle: () => {
    const { isActive } = get()
    if (isActive) {
      set({ isActive: false, filter: "" })
    } else {
      set({ isActive: true })
    }
  },
}))
