export { getPresetLayout, isCustomLayout, layoutPresets } from "./model/layoutPresets"

export {
  useAppearanceSettings,
  useBehaviorSettings,
  useFileDisplaySettings,
  useKeyboardSettings,
  useLayoutSettings,
  usePerformanceSettings,
  useSettingsStore,
} from "./model/store"
export type {
  AppearanceSettings as AppearanceSettingsType,
  AppSettings,
  BehaviorSettings as BehaviorSettingsType,
  CustomLayout,
  DateFormat,
  FileDisplaySettings as FileDisplaySettingsType,
  FontSize,
  KeyboardSettings as KeyboardSettingsType,
  LayoutPreset,
  LayoutPresetId,
  LayoutSettings as LayoutSettingsType,
  PerformanceSettings as PerformanceSettingsType,
  Theme,
} from "./model/types"
export {
  AppearanceSettings,
  BehaviorSettings,
  FileDisplaySettings,
  KeyboardSettings,
  LayoutSettings,
  PerformanceSettings,
  SettingsDialog,
  type SettingsTabId,
  SettingsTabs,
} from "./ui"
