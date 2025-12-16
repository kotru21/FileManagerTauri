import { create } from "zustand"

interface DeleteConfirmState {
  isOpen: boolean
  paths: string[]
  permanent: boolean
  onConfirm: (() => void) | null
  open: (paths: string[], permanent?: boolean) => Promise<boolean>
  close: () => void
  confirm: () => void
  cancel: () => void
}

export const useDeleteConfirmStore = create<DeleteConfirmState>((set, get) => ({
  isOpen: false,
  paths: [],
  permanent: false,
  onConfirm: null,

  open: (paths, permanent = false) => {
    return new Promise<boolean>((resolve) => {
      set({
        isOpen: true,
        paths,
        permanent,
        onConfirm: () => resolve(true),
      })

      // Handle cancel case
      const unsubscribe = useDeleteConfirmStore.subscribe((state) => {
        if (!state.isOpen && !state.onConfirm) {
          resolve(false)
          unsubscribe()
        }
      })
    })
  },

  close: () => set({ isOpen: false, paths: [], onConfirm: null }),

  confirm: () => {
    const { onConfirm } = get()
    if (onConfirm) {
      onConfirm()
    }
    set({ isOpen: false, paths: [], onConfirm: null })
  },

  cancel: () => {
    set({ isOpen: false, paths: [], onConfirm: null })
  },
}))
