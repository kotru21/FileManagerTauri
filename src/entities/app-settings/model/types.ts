import type { ColumnWidths, PanelLayout } from "@/entities/layout"

export type Theme = "dark" | "light" | "system"
export type FontSize = "small" | "medium" | "large"
export type DateFormat = "relative" | "absolute" | "auto"
export type LayoutPresetId = "compact" | "default" | "wide" | "custom"

export interface LayoutPreset {
  id: LayoutPresetId
  name: string
  description: string
  layout: PanelLayout
}

export interface CustomLayout {
  id: string
  name: string
  layout: PanelLayout
  createdAt: number
}

export interface AppearanceSettings {
  theme: Theme
  fontSize: FontSize
  accentColor: string
  enableAnimations: boolean
  reducedMotion: boolean

  // Popover surface visual options
  // Whether to use a translucent popover background (true by default)
  popoverTranslucent?: boolean
  // Opacity for the popover background (0.0 - 1.0)
  popoverOpacity?: number
  // Whether to enable backdrop blur on popovers
  popoverBlur?: boolean
  // Blur radius in pixels
  popoverBlurRadius?: number
}

export interface BehaviorSettings {
  confirmDelete: boolean
  confirmOverwrite: boolean
  doubleClickToOpen: boolean
  singleClickToSelect: boolean
  autoRefreshOnFocus: boolean
  rememberLastPath: boolean
  openFoldersInNewTab: boolean
}

export interface FileDisplaySettings {
  showFileExtensions: boolean
  showFileSizes: boolean
  showFileDates: boolean
  showHiddenFiles: boolean
  dateFormat: DateFormat
  thumbnailSize: "small" | "medium" | "large"
}

export interface LayoutSettings {
  currentPreset: LayoutPresetId
  customLayouts: CustomLayout[]
  panelLayout: PanelLayout
  columnWidths: ColumnWidths
  showStatusBar: boolean
  showToolbar: boolean
  showBreadcrumbs: boolean
  compactMode: boolean
  // Whether to show column headers even when using the simple (non-virtual) list
  showColumnHeadersInSimpleList: boolean
}

export interface PerformanceSettings {
  virtualListThreshold: number
  thumbnailCacheSize: number
  maxSearchResults: number
  debounceDelay: number
  lazyLoadImages: boolean
}

export interface KeyboardShortcut {
  id: string
  action: string
  keys: string
  enabled: boolean
}

export interface KeyboardSettings {
  shortcuts: KeyboardShortcut[]
  enableVimMode: boolean
}

export interface AppSettings {
  appearance: AppearanceSettings
  behavior: BehaviorSettings
  fileDisplay: FileDisplaySettings
  layout: LayoutSettings
  performance: PerformanceSettings
  keyboard: KeyboardSettings
  version: number
}
