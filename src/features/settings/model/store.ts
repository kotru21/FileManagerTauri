import { create } from "zustand"
import { persist, subscribeWithSelector } from "zustand/middleware"
import type { ColumnWidths, PanelLayout } from "@/features/layout"
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

      // Import settings with validation and deep-merge. Returns true on success, false on invalid input.
      importSettings: (json) => {
        try {
          const importedRaw = JSON.parse(json)

          // Basic runtime validation — ensure top-level shape and basic field types.
          function isValidTheme(v: unknown): v is "dark" | "light" | "system" {
            return v === "dark" || v === "light" || v === "system"
          }

          function isValidFontSize(v: unknown): v is "small" | "medium" | "large" {
            return v === "small" || v === "medium" || v === "large"
          }

          function isObject(v: unknown): v is Record<string, unknown> {
            return typeof v === "object" && v !== null && !Array.isArray(v)
          }

          const validate = (input: unknown): boolean => {
            if (!isObject(input)) return false
            // appearance
            if (input.appearance) {
              const a = input.appearance
              if (!isObject(a)) return false
              if (a.theme !== undefined && !isValidTheme(a.theme)) return false
              if (a.fontSize !== undefined && !isValidFontSize(a.fontSize)) return false
              if (a.accentColor !== undefined && typeof a.accentColor !== "string") return false
              if (a.enableAnimations !== undefined && typeof a.enableAnimations !== "boolean")
                return false
              if (a.reducedMotion !== undefined && typeof a.reducedMotion !== "boolean")
                return false
            }

            // behavior
            if (input.behavior) {
              const b = input.behavior
              if (!isObject(b)) return false
              const boolKeys = [
                "confirmDelete",
                "confirmOverwrite",
                "doubleClickToOpen",
                "singleClickToSelect",
                "autoRefreshOnFocus",
                "rememberLastPath",
                "openFoldersInNewTab",
              ]
              for (const k of boolKeys) {
                if (b[k] !== undefined && typeof b[k] !== "boolean") return false
              }
            }

            // fileDisplay
            if (input.fileDisplay) {
              const f = input.fileDisplay
              if (!isObject(f)) return false
              if (f.showFileExtensions !== undefined && typeof f.showFileExtensions !== "boolean")
                return false
              if (f.showFileSizes !== undefined && typeof f.showFileSizes !== "boolean")
                return false
              if (f.showFileDates !== undefined && typeof f.showFileDates !== "boolean")
                return false
              if (f.showHiddenFiles !== undefined && typeof f.showHiddenFiles !== "boolean")
                return false
              if (
                f.dateFormat !== undefined &&
                !(f.dateFormat === "relative" || f.dateFormat === "absolute")
              )
                return false
              if (
                f.thumbnailSize !== undefined &&
                !(
                  f.thumbnailSize === "small" ||
                  f.thumbnailSize === "medium" ||
                  f.thumbnailSize === "large"
                )
              )
                return false
            }

            // layout, performance, keyboard are optional and will be lightly validated
            if (input.layout && !isObject(input.layout)) return false
            if (input.performance && !isObject(input.performance)) return false
            if (input.keyboard && !isObject(input.keyboard)) return false

            return true
          }

          if (!validate(importedRaw)) return false

          const imported = importedRaw as Partial<AppSettings>

          // Simple migrator placeholder — if version mismatch, log and proceed
          if (typeof imported.version === "number" && imported.version !== SETTINGS_VERSION) {
            console.warn(
              "Settings version mismatch, attempting to migrate. Some fields may be reset.",
            )
            // A real migration pipeline would be implemented here.
          }

          // Deep merge helper — arrays in imported override defaults, objects are merged recursively
          const deepMerge = (base: unknown, patch: unknown): unknown => {
            if (!isObject(base) || !isObject(patch)) return patch === undefined ? base : patch
            const out: Record<string, unknown> = { ...(base as Record<string, unknown>) }
            for (const key of Object.keys(patch as Record<string, unknown>)) {
              const pv = (patch as Record<string, unknown>)[key]
              const bv = (base as Record<string, unknown>)[key]
              if (Array.isArray(pv)) {
                out[key] = pv
              } else if (isObject(pv) && isObject(bv)) {
                out[key] = deepMerge(bv, pv)
              } else {
                out[key] = pv
              }
            }
            return out
          }

          const merged = deepMerge(defaultSettings, imported) as unknown as AppSettings

          merged.version = SETTINGS_VERSION

          set({ settings: merged })
          return true
        } catch (e) {
          // invalid JSON or other error
          console.warn("Failed to import settings: ", e)
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
