import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface AppSettings {
  // Appearance
  theme: "dark" | "light" | "system"
  fontSize: "small" | "medium" | "large"

  // Behavior
  confirmDelete: boolean
  doubleClickToOpen: boolean
  singleClickToSelect: boolean

  // File display
  showFileExtensions: boolean
  showFileSizes: boolean
  showFileDates: boolean
  dateFormat: "relative" | "absolute"

  // Performance
  enableAnimations: boolean
  virtualListThreshold: number
}

interface SettingsState {
  settings: AppSettings
  isOpen: boolean
  open: () => void
  close: () => void
  updateSettings: (updates: Partial<AppSettings>) => void
  resetSettings: () => void
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: "dark",
  fontSize: "medium",
  confirmDelete: true,
  doubleClickToOpen: true,
  singleClickToSelect: true,
  showFileExtensions: true,
  showFileSizes: true,
  showFileDates: true,
  dateFormat: "relative",
  enableAnimations: true,
  virtualListThreshold: 100,
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      isOpen: false,
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      updateSettings: (updates) =>
        set((state) => ({
          settings: { ...state.settings, ...updates },
        })),
      resetSettings: () => set({ settings: DEFAULT_SETTINGS }),
    }),
    {
      name: "app-settings",
      partialize: (state) => ({ settings: state.settings }),
    },
  ),
)
