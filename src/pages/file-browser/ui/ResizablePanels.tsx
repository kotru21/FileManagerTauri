import { useCallback, useEffect, useRef } from "react"
import type { PanelImperativeHandle, PanelSize } from "react-resizable-panels"
import { useSelectionStore } from "@/features/file-selection"
import { useLayoutStore } from "@/features/layout"
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
  const layoutSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const showSearchResults = searchResults.length > 0 || isSearching
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

  const panelSizeToPercent = useCallback((s: PanelSize) => {
    if (typeof s === "number") return s
    // react-resizable-panels uses an object for richer sizes
    if (typeof s === "object" && s !== null && "asPercentage" in s) {
      const asPercentage = (s as { asPercentage?: unknown }).asPercentage
      if (typeof asPercentage === "number") return asPercentage
    }
    return 0
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

  return (
    <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0 min-w-0">
      {panelLayout.showSidebar && (
        <>
          <ResizablePanel
            id="sidebar"
            key={panelLayout.sidebarSizeLocked ? `sidebar-${panelLayout.sidebarSize}` : undefined}
            panelRef={sidebarPanelRef}
            defaultSize={sidebarDefaultSize}
            minSize="10%"
            maxSize="400px"
            collapsible
            collapsedSize="56px"
            onResize={(panelSize: PanelSize) => {
              if (isApplyingSettings()) return

              const sizeNum = panelSizeToPercent(panelSize)
              const isCollapsed = sidebarPanelRef.current?.isCollapsed() ?? false

              if (layoutSaveTimeoutRef.current) {
                clearTimeout(layoutSaveTimeoutRef.current)
              }
              layoutSaveTimeoutRef.current = setTimeout(() => {
                setLayout({
                  sidebarSize: isCollapsed ? panelLayout.sidebarSize : sizeNum,
                  sidebarCollapsed: isCollapsed,
                })
              }, 200)
            }}
          >
            <Sidebar collapsed={panelLayout.sidebarCollapsed} />
          </ResizablePanel>
          {!panelLayout.sidebarSizeLocked && <ResizableHandle withHandle />}
        </>
      )}

      <ResizablePanel id="main" defaultSize={mainDefaultSize} minSize={10}>
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
            defaultSize={previewDefaultSize}
            minSize="10%"
            maxSize="400px"
            onResize={(panelSize: PanelSize) => {
              const sizeNum = panelSizeToPercent(panelSize)

              if (isApplyingSettings()) return

              if (layoutSaveTimeoutRef.current) {
                clearTimeout(layoutSaveTimeoutRef.current)
              }
              layoutSaveTimeoutRef.current = setTimeout(() => {
                setLayout({ previewPanelSize: sizeNum })
              }, 150)
            }}
          >
            <PreviewPanel file={selectedFile} onClose={onClosePreview} />
          </ResizablePanel>
        </>
      )}
    </ResizablePanelGroup>
  )
}
