import { create } from "zustand"

export type ToastType = "info" | "success" | "warning" | "error"

export interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
}

interface ToastState {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, "id">) => string
  removeToast: (id: string) => void
  clearAll: () => void
}

let toastId = 0

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  addToast: (toast) => {
    const id = `toast-${++toastId}`
    const newToast: Toast = { ...toast, id }

    set((state) => ({
      toasts: [...state.toasts, newToast],
    }))

    // Automatic removal
    if (toast.duration !== 0) {
      setTimeout(() => {
        get().removeToast(id)
      }, toast.duration ?? 3000)
    }

    return id
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }))
  },

  clearAll: () => {
    set({ toasts: [] })
  },
}))

// Convenience helpers implemented without calling getState() from outside the store
export const toast = {
  info: (message: string, duration?: number) => {
    const id = `toast-${++toastId}`
    const newToast: Toast = { id, message, type: "info", duration }
    useToastStore.setState((s) => ({ toasts: [...s.toasts, newToast] }))
    if (duration !== 0) {
      setTimeout(() => {
        useToastStore.setState((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
      }, duration ?? 3000)
    }
    return id
  },

  success: (message: string, duration?: number) => {
    const id = `toast-${++toastId}`
    const newToast: Toast = { id, message, type: "success", duration }
    useToastStore.setState((s) => ({ toasts: [...s.toasts, newToast] }))
    if (duration !== 0) {
      setTimeout(() => {
        useToastStore.setState((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
      }, duration ?? 3000)
    }
    return id
  },

  warning: (message: string, duration?: number) => {
    const id = `toast-${++toastId}`
    const newToast: Toast = { id, message, type: "warning", duration }
    useToastStore.setState((s) => ({ toasts: [...s.toasts, newToast] }))
    if (duration !== 0) {
      setTimeout(() => {
        useToastStore.setState((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
      }, duration ?? 3000)
    }
    return id
  },

  error: (message: string, duration?: number) => {
    const id = `toast-${++toastId}`
    const newToast: Toast = { id, message, type: "error", duration }
    useToastStore.setState((s) => ({ toasts: [...s.toasts, newToast] }))
    if (duration !== 0) {
      setTimeout(() => {
        useToastStore.setState((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
      }, duration ?? 3000)
    }
    return id
  },
}
