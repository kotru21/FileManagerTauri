import { create } from "zustand";

export type ToastType = "info" | "success" | "warning" | "error";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => string;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

let toastId = 0;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  addToast: (toast) => {
    const id = `toast-${++toastId}`;
    const newToast: Toast = { ...toast, id };

    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));

    // Автоматическое удаление
    if (toast.duration !== 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, toast.duration ?? 3000);
    }

    return id;
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  clearAll: () => {
    set({ toasts: [] });
  },
}));

// Удобные хелперы
export const toast = {
  info: (message: string, duration?: number) =>
    useToastStore.getState().addToast({ message, type: "info", duration }),
  success: (message: string, duration?: number) =>
    useToastStore.getState().addToast({ message, type: "success", duration }),
  warning: (message: string, duration?: number) =>
    useToastStore.getState().addToast({ message, type: "warning", duration }),
  error: (message: string, duration?: number) =>
    useToastStore.getState().addToast({ message, type: "error", duration }),
};
