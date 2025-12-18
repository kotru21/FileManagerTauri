import { create } from "zustand"

interface ConfirmState {
  isOpen: boolean
  title?: string
  message?: string
  onConfirm: (() => void) | null
  open: (title: string, message: string) => Promise<boolean>
  close: () => void
  confirm: () => void
  cancel: () => void
}

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  isOpen: false,
  title: undefined,
  message: undefined,
  onConfirm: null,

  open: (title, message) => {
    return new Promise<boolean>((resolve) => {
      set({ isOpen: true, title, message, onConfirm: () => resolve(true) })

      const unsubscribe = useConfirmStore.subscribe((state) => {
        if (!state.isOpen && !state.onConfirm) {
          resolve(false)
          unsubscribe()
        }
      })
    })
  },

  close: () => set({ isOpen: false, title: undefined, message: undefined, onConfirm: null }),

  confirm: () => {
    const { onConfirm } = get()
    if (onConfirm) onConfirm()
    set({ isOpen: false, title: undefined, message: undefined, onConfirm: null })
  },

  cancel: () => {
    set({ isOpen: false, title: undefined, message: undefined, onConfirm: null })
  },
}))
