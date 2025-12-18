import { create } from "zustand"
import { persist, subscribeWithSelector } from "zustand/middleware"
import type { ColumnWidths, PanelLayout } from "@/features/layout"
import { useLayoutStore } from "@/features/layout"
import { getPresetLayout, isCustomLayout } from "./layoutPresets"
import type {
  AppearanceSettings,
  AppSettings,
  BehaviorSettings,
  CustomLayout,
  FileDisplaySettings,
  KeyboardSettings,
  LayoutPresetId,
  LayoutSettings,
  PerformanceSettings,
} from "./types"

const SETTINGS_VERSION = 1

const defaultAppearance: AppearanceSettings = {
  theme: "dark",
  fontSize: "medium",
  accentColor: "#3b82f6",
  enableAnimations: true,
  reducedMotion: false,
}

const defaultBehavior: BehaviorSettings = {
  confirmDelete: true,
  confirmOverwrite: true,
  doubleClickToOpen: true,
  singleClickToSelect: true,
  autoRefreshOnFocus: true,
  rememberLastPath: true,
  openFoldersInNewTab: false,
}

const defaultFileDisplay: FileDisplaySettings = {
  showFileExtensions: true,
  showFileSizes: true,
  showFileDates: true,
  showHiddenFiles: false,
  dateFormat: "relative",
  thumbnailSize: "medium",
}

const defaultLayout: LayoutSettings = {
  currentPreset: "default",
  customLayouts: [],
  panelLayout: getPresetLayout("default"),
  columnWidths: { size: 90, date: 140, padding: 16 },
  showStatusBar: true,
  showToolbar: true,
  showBreadcrumbs: true,
  compactMode: false,
}

const defaultPerformance: PerformanceSettings = {
  virtualListThreshold: 100,
  thumbnailCacheSize: 100,
  maxSearchResults: 1000,
  debounceDelay: 150,
  lazyLoadImages: true,
}

const defaultKeyboard: KeyboardSettings = {
  shortcuts: [
    { id: "copy", action: "Копировать", keys: "Ctrl+C", enabled: true },
    { id: "cut", action: "Вырезать", keys: "Ctrl+X", enabled: true },
    { id: "paste", action: "Вставить", keys: "Ctrl+V", enabled: true },
    { id: "delete", action: "Удалить", keys: "Delete", enabled: true },
    { id: "rename", action: "Переименовать", keys: "F2", enabled: true },
    { id: "newFolder", action: "Новая папка", keys: "Ctrl+Shift+N", enabled: true },
    { id: "refresh", action: "Обновить", keys: "F5", enabled: true },
    { id: "search", action: "Поиск", keys: "Ctrl+F", enabled: true },
    { id: "quickFilter", action: "Быстрый фильтр", keys: "Ctrl+Shift+F", enabled: true },
    { id: "settings", action: "Настройки", keys: "Ctrl+,", enabled: true },
    { id: "commandPalette", action: "Палитра команд", keys: "Ctrl+K", enabled: true },
  ],
  enableVimMode: false,
}

const defaultSettings: AppSettings = {
  appearance: defaultAppearance,
  behavior: defaultBehavior,
  fileDisplay: defaultFileDisplay,
  layout: defaultLayout,
  performance: defaultPerformance,
  keyboard: defaultKeyboard,
  version: SETTINGS_VERSION,
}

interface SettingsState {
  settings: AppSettings
  isOpen: boolean
  activeTab: string

  // Dialog actions
  open: () => void
  close: () => void
  setActiveTab: (tab: string) => void

  // Settings updates
  updateAppearance: (updates: Partial<AppearanceSettings>) => void
  updateBehavior: (updates: Partial<BehaviorSettings>) => void
  updateFileDisplay: (updates: Partial<FileDisplaySettings>) => void
  updateLayout: (updates: Partial<LayoutSettings>) => void
  updatePerformance: (updates: Partial<PerformanceSettings>) => void
  updateKeyboard: (updates: Partial<KeyboardSettings>) => void

  // Layout specific
  setLayoutPreset: (presetId: LayoutPresetId) => void
  updatePanelLayout: (layout: Partial<PanelLayout>) => void
  updateColumnWidths: (widths: Partial<ColumnWidths>) => void
  saveCustomLayout: (name: string) => string
  deleteCustomLayout: (id: string) => void
  applyCustomLayout: (id: string) => void

  // Utility
  resetSettings: () => void
  resetSection: (section: keyof Omit<AppSettings, "version">) => void
  exportSettings: () => string
  importSettings: (json: string) => boolean
}

const generateId = () => Math.random().toString(36).substring(2, 9)

export const useSettingsStore = create<SettingsState>()(
  persist(
    subscribeWithSelector((set, get) => ({
      settings: defaultSettings,
      isOpen: false,
      activeTab: "appearance",

      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      setActiveTab: (tab) => set({ activeTab: tab }),

      updateAppearance: (updates) =>
        set((state) => ({
          settings: {
            ...state.settings,
            appearance: { ...state.settings.appearance, ...updates },
          },
        })),

      updateBehavior: (updates) =>
        set((state) => ({
          settings: {
            ...state.settings,
            behavior: { ...state.settings.behavior, ...updates },
          },
        })),

      updateFileDisplay: (updates) =>
        set((state) => ({
          settings: {
            ...state.settings,
            fileDisplay: { ...state.settings.fileDisplay, ...updates },
          },
        })),

      updateLayout: (updates) =>
        set((state) => ({
          settings: {
            ...state.settings,
            layout: { ...state.settings.layout, ...updates },
          },
        })),

      updatePerformance: (updates) =>
        set((state) => ({
          settings: {
            ...state.settings,
            performance: { ...state.settings.performance, ...updates },
          },
        })),

      updateKeyboard: (updates) =>
        set((state) => ({
          settings: {
            ...state.settings,
            keyboard: { ...state.settings.keyboard, ...updates },
          },
        })),

      setLayoutPreset: (presetId) => {
        const presetLayout = getPresetLayout(presetId)
        set((state) => ({
          settings: {
            ...state.settings,
            layout: {
              ...state.settings.layout,
              currentPreset: presetId,
              panelLayout: presetLayout,
            },
          },
        }))
      },

      updatePanelLayout: (layout) =>
        set((state) => {
          const newLayout = { ...state.settings.layout.panelLayout, ...layout }
          const currentPreset = state.settings.layout.currentPreset
          const isCustom = isCustomLayout(newLayout, currentPreset)

          return {
            settings: {
              ...state.settings,
              layout: {
                ...state.settings.layout,
                panelLayout: newLayout,
                currentPreset: isCustom ? "custom" : currentPreset,
              },
            },
          }
        }),

      updateColumnWidths: (widths) =>
        set((state) => {
          const merged = { ...state.settings.layout.columnWidths, ...widths }

          return {
            settings: {
              ...state.settings,
              layout: {
                ...state.settings.layout,
                columnWidths: merged,
              },
            },
          }
        }),
      saveCustomLayout: (name) => {
        const id = generateId()
        const customLayout: CustomLayout = {
          id,
          name,
          layout: get().settings.layout.panelLayout,
          createdAt: Date.now(),
        }

        set((state) => ({
          settings: {
            ...state.settings,
            layout: {
              ...state.settings.layout,
              customLayouts: [...state.settings.layout.customLayouts, customLayout],
            },
          },
        }))

        return id
      },

      deleteCustomLayout: (id) =>
        set((state) => ({
          settings: {
            ...state.settings,
            layout: {
              ...state.settings.layout,
              customLayouts: state.settings.layout.customLayouts.filter((l) => l.id !== id),
            },
          },
        })),

      applyCustomLayout: (id) => {
        const { customLayouts } = get().settings.layout
        const layout = customLayouts.find((l) => l.id === id)
        if (layout) {
          set((state) => ({
            settings: {
              ...state.settings,
              layout: {
                ...state.settings.layout,
                panelLayout: layout.layout,
                currentPreset: "custom",
              },
            },
          }))
        }
      },

      resetSettings: () => set({ settings: defaultSettings }),

      resetSection: (section) =>
        set((state) => {
          const defaults: Record<string, unknown> = {
            appearance: defaultAppearance,
            behavior: defaultBehavior,
            fileDisplay: defaultFileDisplay,
            layout: defaultLayout,
            performance: defaultPerformance,
            keyboard: defaultKeyboard,
          }

          return {
            settings: {
              ...state.settings,
              [section]: defaults[section],
            },
          }
        }),

      exportSettings: () => JSON.stringify(get().settings, null, 2),

      importSettings: (json) => {
        try {
          const imported = JSON.parse(json) as AppSettings
          if (imported.version !== SETTINGS_VERSION) {
            console.warn("Settings version mismatch, some settings may be reset")
          }
          set({ settings: { ...defaultSettings, ...imported } })
          return true
        } catch {
          return false
        }
      },
    })),
    {
      name: "app-settings",
      version: SETTINGS_VERSION,
      partialize: (state) => ({ settings: state.settings }),
    },
  ),
)

// Selectors for optimized re-renders
export const useAppearanceSettings = () => useSettingsStore((s) => s.settings.appearance)
export const useBehaviorSettings = () => useSettingsStore((s) => s.settings.behavior)
export const useFileDisplaySettings = () => useSettingsStore((s) => s.settings.fileDisplay)
export const useLayoutSettings = () => useSettingsStore((s) => s.settings.layout)
export const usePerformanceSettings = () => useSettingsStore((s) => s.settings.performance)
export const useKeyboardSettings = () => useSettingsStore((s) => s.settings.keyboard)
