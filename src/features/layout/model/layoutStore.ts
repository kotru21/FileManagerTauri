import { create } from "zustand"
import { subscribeWithSelector } from "zustand/middleware"

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
}

const defaultLayout: PanelLayout = {
  sidebarSize: 20,
  mainPanelSize: 55,
  previewPanelSize: 25,
  showSidebar: true,
  sidebarCollapsed: false,
  showPreview: true,
  columnWidths: {
    size: 90,
    date: 140,
    padding: 16,
  },
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
  subscribeWithSelector((set) => ({
    layout: defaultLayout,

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

    resetLayout: () => set({ layout: defaultLayout }),

    applyLayout: (layout) => set({ layout }),
  })),
)

// Selector hooks for optimized re-renders
export const useSidebarLayout = () =>
  useLayoutStore((s) => ({
    size: s.layout.sidebarSize,
    show: s.layout.showSidebar,
    collapsed: s.layout.sidebarCollapsed,
  }))

export const usePreviewLayout = () =>
  useLayoutStore((s) => ({
    size: s.layout.previewPanelSize,
    show: s.layout.showPreview,
  }))

export const useColumnWidths = () => useLayoutStore((s) => s.layout.columnWidths)
