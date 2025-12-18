import { create } from "zustand"
import { persist, subscribeWithSelector } from "zustand/middleware"

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
  sidebarCollapsed?: boolean
  showPreview: boolean
  columnWidths: ColumnWidths
  // Lock flags: when true, size is controlled via settings sliders and resizing is disabled
  sidebarSizeLocked?: boolean
  previewSizeLocked?: boolean
}

const DEFAULT_LAYOUT: PanelLayout = {
  sidebarSize: 15,
  mainPanelSize: 60,
  previewPanelSize: 25,
  showSidebar: true,
  sidebarCollapsed: false,
  showPreview: true,
  columnWidths: {
    size: 100,
    date: 180,
    padding: 8,
  },
  sidebarSizeLocked: false,
  previewSizeLocked: false,
}

interface LayoutState {
  layout: PanelLayout
  setLayout: (layout: Partial<PanelLayout>) => void
  setSidebarSize: (size: number) => void
  setMainPanelSize: (size: number) => void
  setPreviewPanelSize: (size: number) => void
  setColumnWidth: (column: keyof ColumnWidths, width: number) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebar: () => void
  togglePreview: () => void
  resetLayout: () => void
  applyLayout: (layout: PanelLayout) => void
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    subscribeWithSelector((set) => ({
      layout: DEFAULT_LAYOUT,

      setLayout: (updates) =>
        set((state) => ({
          layout: { ...state.layout, ...updates },
        })),

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

      setSidebarCollapsed: (collapsed) =>
        set((state) => ({
          layout: { ...state.layout, sidebarCollapsed: collapsed },
        })),

      toggleSidebar: () =>
        set((state) => ({
          layout: { ...state.layout, showSidebar: !state.layout.showSidebar },
        })),

      togglePreview: () =>
        set((state) => ({
          layout: { ...state.layout, showPreview: !state.layout.showPreview },
        })),

      resetLayout: () => set({ layout: DEFAULT_LAYOUT }),

      applyLayout: (layout) => set({ layout }),
    })),
    {
      name: "layout-storage",
      partialize: (state) => ({ layout: state.layout }),
    },
  ),
)

// Selector hooks for optimized re-renders
export const useSidebarLayout = () =>
  useLayoutStore((s) => ({
    showSidebar: s.layout.showSidebar,
    sidebarSize: s.layout.sidebarSize,
    sidebarCollapsed: s.layout.sidebarCollapsed,
  }))

export const usePreviewLayout = () =>
  useLayoutStore((s) => ({
    showPreview: s.layout.showPreview,
    previewPanelSize: s.layout.previewPanelSize,
  }))

export const useColumnWidths = () => useLayoutStore((s) => s.layout.columnWidths)
