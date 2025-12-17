import type { PanelLayout } from "@/features/layout"
import type { LayoutPreset, LayoutPresetId } from "./types"

const defaultColumnWidths = {
  size: 90,
  date: 140,
  padding: 16,
}

export const layoutPresets: Record<LayoutPresetId, LayoutPreset> = {
  compact: {
    id: "compact",
    name: "Компактный",
    description: "Минимальный интерфейс для максимального пространства файлов",
    layout: {
      sidebarSize: 15,
      mainPanelSize: 85,
      previewPanelSize: 0,
      showSidebar: true,
      sidebarCollapsed: true,
      showPreview: false,
      columnWidths: {
        size: 70,
        date: 100,
        padding: 8,
      },
    },
  },
  default: {
    id: "default",
    name: "Стандартный",
    description: "Сбалансированный лейаут для повседневного использования",
    layout: {
      sidebarSize: 20,
      mainPanelSize: 55,
      previewPanelSize: 25,
      showSidebar: true,
      sidebarCollapsed: false,
      showPreview: true,
      columnWidths: defaultColumnWidths,
    },
  },
  wide: {
    id: "wide",
    name: "Широкий",
    description: "Расширенная боковая панель с большим превью",
    layout: {
      sidebarSize: 25,
      mainPanelSize: 40,
      previewPanelSize: 35,
      showSidebar: true,
      sidebarCollapsed: false,
      showPreview: true,
      columnWidths: {
        size: 100,
        date: 160,
        padding: 20,
      },
    },
  },
  custom: {
    id: "custom",
    name: "Пользовательский",
    description: "Ваши собственные настройки лейаута",
    layout: {
      sidebarSize: 20,
      mainPanelSize: 55,
      previewPanelSize: 25,
      showSidebar: true,
      sidebarCollapsed: false,
      showPreview: true,
      columnWidths: defaultColumnWidths,
    },
  },
}

export function getPresetLayout(presetId: LayoutPresetId): PanelLayout {
  return layoutPresets[presetId]?.layout ?? layoutPresets.default.layout
}

export function isCustomLayout(current: PanelLayout, presetId: LayoutPresetId): boolean {
  if (presetId === "custom") return true

  const preset = layoutPresets[presetId]?.layout
  if (!preset) return true

  return (
    current.sidebarSize !== preset.sidebarSize ||
    current.mainPanelSize !== preset.mainPanelSize ||
    current.previewPanelSize !== preset.previewPanelSize ||
    current.showSidebar !== preset.showSidebar ||
    current.showPreview !== preset.showPreview ||
    current.sidebarCollapsed !== preset.sidebarCollapsed
  )
}
