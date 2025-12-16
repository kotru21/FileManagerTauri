import { create } from "zustand"
import { persist } from "zustand/middleware"

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
}

const defaultLayout: PanelLayout = {
  sidebarSize: 20,
  sidebarCollapsed: false,
  mainPanelSize: 80,
  previewPanelSize: 0,
  showSidebar: true,
  showPreview: false,
  columnWidths: {
    size: 80,
    date: 140,
    padding: 12,
  },
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      layout: defaultLayout,

      setLayout: (newLayout) =>
        set((state) => ({
          layout: { ...state.layout, ...newLayout },
        })),

      setSidebarSize: (size) =>
        set((state) => ({
          layout: { ...state.layout, sidebarSize: size },
        })),

      setSidebarCollapsed: (collapsed: boolean) =>
        set((state) => ({
          layout: { ...state.layout, sidebarCollapsed: collapsed },
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

      resetLayout: () => set({ layout: defaultLayout }),
    }),
    {
      name: "file-manager-layout",
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<LayoutState> | undefined
        return {
          ...currentState,
          layout: {
            ...defaultLayout,
            ...persisted?.layout,
            columnWidths: {
              ...defaultLayout.columnWidths,
              ...persisted?.layout?.columnWidths,
            },
          },
        }
      },
    },
  ),
)
