import { useCallback, useEffect, useRef, useState } from "react"
import type { PanelImperativeHandle } from "react-resizable-panels"
import { useLayoutStore } from "@/entities/layout"
import { useSelectionStore } from "@/features/file-selection"
import { isApplyingSettings } from "@/features/layout/sync"
import { useNavigationStore } from "@/features/navigation"
import { SearchResultItem, useSearchStore } from "@/features/search-content"
import type { FileEntry } from "@/shared/api/tauri"
import { tauriClient } from "@/shared/api/tauri/client"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup, ScrollArea } from "@/shared/ui"
import { FileExplorer, PreviewPanel, Sidebar } from "@/widgets"

interface ResizablePanelsProps {
  onFilesChange: (files: FileEntry[]) => void
  selectedFile: FileEntry | null
  onClosePreview?: () => void
}

export function ResizablePanels({
  onFilesChange,
  selectedFile,
  onClosePreview,
}: ResizablePanelsProps) {
  const { layout: panelLayout, setLayout } = useLayoutStore()
  const { results: searchResults, isSearching, reset: resetSearch } = useSearchStore()
  const selectFile = useSelectionStore((s) => s.selectFile)
  const navigate = useNavigationStore((s) => s.navigate)
  const sidebarPanelRef = useRef<PanelImperativeHandle | null>(null)
  const previewPanelRef = useRef<PanelImperativeHandle | null>(null)
  const showSearchResults = searchResults.length > 0 || isSearching

  // Track sidebar collapsed state locally for immediate UI updates without
  // triggering store re-renders during drag (which would break the resize).
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    panelLayout.sidebarCollapsed ?? false,
  )
  const lastCollapsedRef = useRef(panelLayout.sidebarCollapsed ?? false)

  // Sync collapsed state from external sources (e.g. preset application)
  useEffect(() => {
    const external = panelLayout.sidebarCollapsed ?? false
    if (external !== lastCollapsedRef.current) {
      lastCollapsedRef.current = external
      setSidebarCollapsed(external)
    }
  }, [panelLayout.sidebarCollapsed])

  const handleSearchResultSelect = useCallback(
    async (path: string) => {
      try {
        const parentPath = await tauriClient.getParentPath(path)
        if (parentPath) {
          navigate(parentPath)
          resetSearch()
          setTimeout(() => {
            selectFile(path)
          }, 100)
        }
      } catch {
        void 0
      }
    },
    [navigate, resetSearch, selectFile],
  )
  useEffect(() => {
    let mounted = true
    let cleanup = () => {}

    ;(async () => {
      const mod = await import("@/features/layout/panelController")
      if (!mounted) return
      mod.registerSidebar(sidebarPanelRef)
      mod.registerPreview(previewPanelRef)
      try {
        mod.applyLayoutToPanels(useLayoutStore.getState().layout)
      } catch {
        void 0
      }

      cleanup = () => {
        try {
          mod.registerSidebar(null)
          mod.registerPreview(null)
        } catch {
          void 0
        }
      }
    })()

    return () => {
      mounted = false
      cleanup()
    }
  }, [])

  const parsePercent = useCallback((v: number | string | undefined) => {
    if (typeof v === "number") return v
    if (!v) return 0
    return Number.parseFloat(String(v).replace("%", ""))
  }, [])

  const sidebarDefaultSize = parsePercent(panelLayout.sidebarSize)
  const previewDefaultSize = parsePercent(panelLayout.previewPanelSize)

  const mainDefaultSize = (() => {
    const sidebar = panelLayout.showSidebar ? parsePercent(panelLayout.sidebarSize) : 0
    const preview = panelLayout.showPreview ? parsePercent(panelLayout.previewPanelSize) : 0

    if (panelLayout.showSidebar && panelLayout.showPreview) {
      return Math.max(10, 100 - sidebar - preview)
    }
    if (panelLayout.showSidebar) return Math.max(30, 100 - sidebar)
    if (panelLayout.showPreview) return Math.max(30, 100 - preview)
    return 100
  })()

  // Persist layout to store only after pointer release (onLayoutChanged).
  // Using onResize + debounce for persistence would update the store mid-drag,
  // causing defaultSize prop changes → Panel re-registration → Group
  // re-registration → drag state lost in mountedGroups.
  const handleLayoutChanged = useCallback(
    (layout: Record<string, number>) => {
      if (isApplyingSettings()) return

      const isCollapsed = sidebarPanelRef.current?.isCollapsed() ?? false

      setLayout({
        sidebarSize: isCollapsed
          ? panelLayout.sidebarSize
          : (layout.sidebar ?? panelLayout.sidebarSize),
        sidebarCollapsed: isCollapsed,
        mainPanelSize: layout.main ?? panelLayout.mainPanelSize,
        previewPanelSize: layout.preview ?? panelLayout.previewPanelSize,
      })
    },
    [panelLayout.sidebarSize, panelLayout.mainPanelSize, panelLayout.previewPanelSize, setLayout],
  )

  return (
    <ResizablePanelGroup
      direction="horizontal"
      className="flex-1 min-h-0 min-w-0"
      onLayoutChanged={handleLayoutChanged}
    >
      {panelLayout.showSidebar && (
        <>
          <ResizablePanel
            id="sidebar"
            key={panelLayout.sidebarSizeLocked ? `sidebar-${panelLayout.sidebarSize}` : undefined}
            panelRef={sidebarPanelRef}
            defaultSize={`${sidebarDefaultSize}%`}
            minSize="10%"
            maxSize="400px"
            collapsible
            collapsedSize="56px"
            onResize={() => {
              if (isApplyingSettings()) return
              const isCollapsed = sidebarPanelRef.current?.isCollapsed() ?? false
              if (isCollapsed !== lastCollapsedRef.current) {
                lastCollapsedRef.current = isCollapsed
                setSidebarCollapsed(isCollapsed)
              }
            }}
          >
            <Sidebar collapsed={sidebarCollapsed} />
          </ResizablePanel>
          {!panelLayout.sidebarSizeLocked && <ResizableHandle withHandle />}
        </>
      )}

      <ResizablePanel id="main" defaultSize={`${mainDefaultSize}%`} minSize={10}>
        {showSearchResults ? (
          <ScrollArea className="h-full">
            <div className="p-2 space-y-1">
              {searchResults.map((result) => (
                <SearchResultItem
                  key={result.path}
                  result={result}
                  onSelect={handleSearchResultSelect}
                />
              ))}
            </div>
          </ScrollArea>
        ) : (
          <FileExplorer onFilesChange={onFilesChange} />
        )}
      </ResizablePanel>
      {panelLayout.showPreview && (
        <>
          {!panelLayout.previewSizeLocked && <ResizableHandle withHandle />}
          <ResizablePanel
            id="preview"
            key={
              panelLayout.previewSizeLocked ? `preview-${panelLayout.previewPanelSize}` : undefined
            }
            panelRef={previewPanelRef}
            defaultSize={`${previewDefaultSize}%`}
            minSize="10%"
            maxSize="400px"
          >
            <PreviewPanel file={selectedFile} onClose={onClosePreview} />
          </ResizablePanel>
        </>
      )}
    </ResizablePanelGroup>
  )
}
