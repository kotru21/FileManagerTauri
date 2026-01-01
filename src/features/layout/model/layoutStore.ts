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
    subscribeWithSelector<LayoutState>((set) => ({
      layout: DEFAULT_LAYOUT,

      setLayout: (updates) =>
        set((state) => ({
          layout: { ...state.layout, ...updates },
        })),

      setSidebarSize: (size) =>
        set((state) => ({
          layout: {
            ...state.layout,
            sidebarSize:
              typeof size === "string" ? parseFloat(String(size).replace("%", "")) : size,
          },
        })),

      setMainPanelSize: (size) =>
        set((state) => ({
          layout: {
            ...state.layout,
            mainPanelSize:
              typeof size === "string" ? parseFloat(String(size).replace("%", "")) : size,
          },
        })),

      setPreviewPanelSize: (size) =>
        set((state) => ({
          layout: {
            ...state.layout,
            previewPanelSize:
              typeof size === "string" ? parseFloat(String(size).replace("%", "")) : size,
          },
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
      // Restore full layout from localStorage to ensure panel sizes survive page reload.
      // The settingsStore (app-settings) is the canonical source, but initLayoutSync runs
      // asynchronously after first render. By restoring sizes here, panels render with
      // correct dimensions immediately, and initLayoutSync will overwrite if settings differ.
      merge: (persistedState, currentState) => {
        try {
          const persisted = persistedState as Partial<LayoutState> | undefined
          const persistedLayout = persisted?.layout
          if (!persistedLayout) return currentState

          // Parse size values to numbers (could be stored as "15%" or 15)
          const parseSize = (v: number | string | undefined, fallback: number): number => {
            if (typeof v === "number") return v
            if (typeof v === "string") {
              const num = Number.parseFloat(v.replace("%", ""))
              return Number.isNaN(num) ? fallback : num
            }
            return fallback
          }

          return {
            ...currentState,
            layout: {
              ...currentState.layout,
              // Restore panel sizes
              sidebarSize: parseSize(persistedLayout.sidebarSize, currentState.layout.sidebarSize),
              mainPanelSize: parseSize(
                persistedLayout.mainPanelSize,
                currentState.layout.mainPanelSize,
              ),
              previewPanelSize: parseSize(
                persistedLayout.previewPanelSize,
                currentState.layout.previewPanelSize,
              ),
              // Restore visibility and collapse state
              showSidebar: persistedLayout.showSidebar ?? currentState.layout.showSidebar,
              showPreview: persistedLayout.showPreview ?? currentState.layout.showPreview,
              sidebarCollapsed:
                persistedLayout.sidebarCollapsed ?? currentState.layout.sidebarCollapsed,
              // Restore lock flags
              sidebarSizeLocked:
                persistedLayout.sidebarSizeLocked ?? currentState.layout.sidebarSizeLocked,
              previewSizeLocked:
                persistedLayout.previewSizeLocked ?? currentState.layout.previewSizeLocked,
              // Restore expanded sections
              expandedSections:
                persistedLayout.expandedSections ?? currentState.layout.expandedSections,
              // Restore column widths
              columnWidths: {
                ...currentState.layout.columnWidths,
                ...(persistedLayout.columnWidths ?? {}),
              },
            },
          }
        } catch {
          return currentState
        }
      },
      // onRehydrateStorage will migrate legacy numeric persisted values into percent-strings
      onRehydrateStorage: () => () => {
        const key = "layout-storage"
        try {
          const raw = localStorage.getItem(key)
          if (!raw) return
          const parsed = JSON.parse(raw) as unknown

          const getLayoutObject = (p: unknown): Record<string, unknown> | undefined => {
            if (p && typeof p === "object") {
              const obj = p as Record<string, unknown>
              if (obj.state && typeof obj.state === "object") {
                const state = obj.state as Record<string, unknown>
                if (state.layout && typeof state.layout === "object")
                  return state.layout as Record<string, unknown>
              }
              if (obj.layout && typeof obj.layout === "object")
                return obj.layout as Record<string, unknown>
            }
            return undefined
          }

          const layoutObj = getLayoutObject(parsed)
          if (!layoutObj) return

          const keys: Array<"sidebarSize" | "mainPanelSize" | "previewPanelSize"> = [
            "sidebarSize",
            "mainPanelSize",
            "previewPanelSize",
          ]
          let changed = false

          for (const k of keys) {
            if (Object.hasOwn(layoutObj, k) && typeof layoutObj[k] === "number") {
              layoutObj[k] = `${layoutObj[k]}%`
              changed = true
            }
          }

          if (changed) {
            localStorage.setItem(key, JSON.stringify(parsed))
          }
        } catch {
          /* ignore migration errors */
        }
      },
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
