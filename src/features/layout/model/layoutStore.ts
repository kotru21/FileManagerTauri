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

// Ensure persisted representation uses percent-strings for sizes: subscribe and rewrite storage when layout updates
const LAYOUT_KEY = "layout-storage"
useLayoutStore.subscribe(
  (s) => s.layout,
  (newLayout) => {
    try {
      const toPercent = (v?: number | string) => (typeof v === "number" ? `${v}%` : v)
      const payload = {
        state: {
          layout: {
            sidebarSize: toPercent(newLayout.sidebarSize),
            mainPanelSize: toPercent(newLayout.mainPanelSize),
            previewPanelSize: toPercent(newLayout.previewPanelSize),
          },
        },
      }
      localStorage.setItem(LAYOUT_KEY, JSON.stringify(payload))
    } catch {
      /* ignore */
    }
  },
)
