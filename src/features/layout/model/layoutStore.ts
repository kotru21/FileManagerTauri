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
  // Persisted expanded/collapsed state for sidebar sections
  expandedSections?: Record<string, boolean>
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
  // Default: all sections expanded
  expandedSections: {
    bookmarks: true,
    recent: true,
    drives: true,
    quickAccess: true,
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
  setSectionExpanded: (section: string, expanded: boolean) => void
  toggleSectionExpanded: (section: string) => void
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

      setSectionExpanded: (section: string, expanded: boolean) =>
        set((state) => ({
          layout: {
            ...state.layout,
            expandedSections: { ...(state.layout.expandedSections ?? {}), [section]: expanded },
          },
        })),

      toggleSectionExpanded: (section: string) =>
        set((state) => ({
          layout: {
            ...state.layout,
            expandedSections: {
              ...(state.layout.expandedSections ?? {}),
              [section]: !(state.layout.expandedSections?.[section] ?? true),
            },
          },
        })),

      resetLayout: () => set({ layout: DEFAULT_LAYOUT }),

      applyLayout: (layout) =>
        set((state) => ({
          layout: {
            ...layout,
            // Preserve persisted expandedSections if already set in runtime state
            expandedSections: state.layout.expandedSections ?? layout.expandedSections,
          },
        })),
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
