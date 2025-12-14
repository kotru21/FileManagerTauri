import { create } from "zustand"
import { persist } from "zustand/middleware"
import { STORAGE_VERSIONS, VIEW_MODES, type ViewMode } from "@/shared/config"

function isValidViewMode(value: unknown): value is ViewMode {
  return typeof value === "string" && (Object.values(VIEW_MODES) as string[]).includes(value)
}

export interface ColumnWidths {
  size: number
  date: number
  padding: number
}

export interface PanelLayout {
  sidebarSize: number
  mainPanelSize: number
  previewPanelSize: number
  showSidebar: boolean
  showPreview: boolean
  columnWidths: ColumnWidths
  viewMode?: ViewMode
}

interface LayoutState {
  layout: PanelLayout
  setLayout: (layout: Partial<PanelLayout>) => void
  setViewMode: (mode: ViewMode) => void
  toggleViewMode: () => void
  setSidebarSize: (size: number) => void
  setMainPanelSize: (size: number) => void
  setPreviewPanelSize: (size: number) => void
  setColumnWidth: (column: keyof ColumnWidths, width: number) => void
  toggleSidebar: () => void
  togglePreview: () => void
  resetLayout: () => void
}

const defaultLayout: PanelLayout = {
  sidebarSize: 20,
  mainPanelSize: 80,
  previewPanelSize: 0,
  showSidebar: true,
  showPreview: false,
  columnWidths: {
    size: 80,
    date: 140,
    padding: 12,
  },
  viewMode: VIEW_MODES.list,
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      layout: defaultLayout,

      setLayout: (newLayout) =>
        set((state) => {
          const merged = { ...state.layout, ...newLayout } as PanelLayout

          // Сравниваем поля, чтобы избежать обновления состояния, если ничего не изменилось
          const equal =
            merged.sidebarSize === state.layout.sidebarSize &&
            merged.mainPanelSize === state.layout.mainPanelSize &&
            merged.previewPanelSize === state.layout.previewPanelSize &&
            merged.showSidebar === state.layout.showSidebar &&
            merged.showPreview === state.layout.showPreview &&
            merged.columnWidths.size === state.layout.columnWidths.size &&
            merged.columnWidths.date === state.layout.columnWidths.date &&
            merged.columnWidths.padding === state.layout.columnWidths.padding &&
            merged.viewMode === state.layout.viewMode

          if (equal) return state
          return { layout: merged }
        }),

      setSidebarSize: (size) =>
        set((state) => ({
          layout: { ...state.layout, sidebarSize: size },
        })),

      setMainPanelSize: (size) =>
        set((state) => ({
          layout: { ...state.layout, mainPanelSize: size },
        })),

      setPreviewPanelSize: (size) =>
        set((state) => ({
          layout: { ...state.layout, previewPanelSize: size },
        })),

      setColumnWidth: (column, width) =>
        set((state) => ({
          layout: {
            ...state.layout,
            columnWidths: { ...state.layout.columnWidths, [column]: width },
          },
        })),

      toggleSidebar: () =>
        set((state) => ({
          layout: { ...state.layout, showSidebar: !state.layout.showSidebar },
        })),

      togglePreview: () =>
        set((state) => ({
          layout: { ...state.layout, showPreview: !state.layout.showPreview },
        })),

      setViewMode: (mode: ViewMode) =>
        set((state) => ({ layout: { ...state.layout, viewMode: mode } })),

      toggleViewMode: () =>
        set((state) => ({
          layout: {
            ...state.layout,
            viewMode:
              (state.layout.viewMode ?? VIEW_MODES.list) === VIEW_MODES.grid
                ? VIEW_MODES.list
                : VIEW_MODES.grid,
          },
        })),

      resetLayout: () => set({ layout: defaultLayout }),
    }),
    {
      name: "file-manager-layout",
      version: STORAGE_VERSIONS.LAYOUT,
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<LayoutState> | undefined

        const persistedViewMode = persisted?.layout?.viewMode
        const safeViewMode = isValidViewMode(persistedViewMode)
          ? persistedViewMode
          : defaultLayout.viewMode

        return {
          ...currentState,
          layout: {
            ...defaultLayout,
            ...persisted?.layout,
            columnWidths: {
              ...defaultLayout.columnWidths,
              ...persisted?.layout?.columnWidths,
            },
            viewMode: safeViewMode,
          },
        }
      },
      migrate: (persistedState, version) => {
        // Миграция для будущих версий
        if (version === 0) {
          return persistedState
        }
        // Защита от некорректных значений в storage
        const state = persistedState as LayoutState
        if (!isValidViewMode(state?.layout?.viewMode)) {
          return {
            ...state,
            layout: { ...state.layout, viewMode: defaultLayout.viewMode },
          }
        }
        return state
      },
    },
  ),
)
