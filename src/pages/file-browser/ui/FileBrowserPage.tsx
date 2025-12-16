import { useQueryClient } from "@tanstack/react-query"
import { openPath } from "@tauri-apps/plugin-opener"
import { useCallback, useEffect, useMemo, useRef } from "react"
import { fileKeys, useDirectoryContents } from "@/entities/file-entry"
import { useSelectionStore } from "@/features/file-selection"
import { useInlineEditStore } from "@/features/inline-edit"
import { useLayoutStore } from "@/features/layout"
import { useNavigationStore } from "@/features/navigation"
import { SearchResultItem, useSearchStore } from "@/features/search-content"
import { TabBar, useTabsStore } from "@/features/tabs"
import type { FileEntry } from "@/shared/api/tauri"
import { commands } from "@/shared/api/tauri"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  TooltipProvider,
  toast,
} from "@/shared/ui"
import { Breadcrumbs, FileExplorer, PreviewPanel, Sidebar, StatusBar, Toolbar } from "@/widgets"

const COLLAPSE_THRESHOLD = 8
const COLLAPSED_SIZE = 6

export function FileBrowserPage() {
  const queryClient = useQueryClient()
  const { currentPath, navigate } = useNavigationStore()
  const { layout, setSidebarSize, setPreviewPanelSize, setSidebarCollapsed } = useLayoutStore()
  const { tabs, activeTabId, addTab, updateTabPath } = useTabsStore()
  const { results, isSearching, query } = useSearchStore()
  const { clearSelection, getSelectedPaths } = useSelectionStore()
  const { startNewFolder, startNewFile } = useInlineEditStore()

  // Debounce refs for resize
  const sidebarResizeTimerRef = useRef<number | null>(null)
  const previewResizeTimerRef = useRef<number | null>(null)

  // Initialize first tab if none exists
  useEffect(() => {
    if (tabs.length === 0) {
      addTab(currentPath || "C:\\")
    }
  }, [tabs.length, addTab, currentPath])

  // Sync tab path with navigation
  useEffect(() => {
    if (activeTabId && currentPath) {
      updateTabPath(activeTabId, currentPath)
    }
  }, [activeTabId, currentPath, updateTabPath])

  // Handle tab changes
  const handleTabChange = useCallback(
    (path: string) => {
      navigate(path)
    },
    [navigate],
  )

  // Get selected file for preview
  const { data: entries } = useDirectoryContents(currentPath)
  const selectedPaths = getSelectedPaths()

  const selectedFile = useMemo((): FileEntry | null => {
    if (selectedPaths.length !== 1) return null
    return entries?.find((e) => e.path === selectedPaths[0]) || null
  }, [selectedPaths, entries])

  // Show search results when we have results
  const showSearchResults = query.length > 0 && (isSearching || results.length > 0)

  const handleSearchResultClick = async (path: string) => {
    try {
      const parentResult = await commands.getParentPath(path)
      if (parentResult.status === "ok" && parentResult.data) {
        navigate(parentResult.data)
        clearSelection()
      }
    } catch (error) {
      console.error("Failed to navigate to search result:", error)
      try {
        await openPath(path)
      } catch (openError) {
        toast.error(`Не удалось открыть файл: ${openError}`)
      }
    }
  }

  const handleRefresh = useCallback(() => {
    if (currentPath) {
      queryClient.invalidateQueries({ queryKey: fileKeys.directory(currentPath) })
    }
  }, [currentPath, queryClient])

  const handleNewFolder = useCallback(() => {
    if (currentPath) {
      startNewFolder(currentPath)
    }
  }, [currentPath, startNewFolder])

  const handleNewFile = useCallback(() => {
    if (currentPath) {
      startNewFile(currentPath)
    }
  }, [currentPath, startNewFile])

  // Debounced resize handlers
  const handleSidebarResize = useCallback(
    (size: number) => {
      if (sidebarResizeTimerRef.current) {
        cancelAnimationFrame(sidebarResizeTimerRef.current)
      }
      sidebarResizeTimerRef.current = requestAnimationFrame(() => {
        const collapsed = size < COLLAPSE_THRESHOLD
        setSidebarCollapsed(collapsed)
        // If collapsed, set to small collapsed size; otherwise set actual size
        setSidebarSize(collapsed ? COLLAPSED_SIZE : size)
      })
    },
    [setSidebarCollapsed, setSidebarSize],
  )

  const handlePreviewResize = useCallback(
    (size: number) => {
      if (previewResizeTimerRef.current) {
        cancelAnimationFrame(previewResizeTimerRef.current)
      }
      previewResizeTimerRef.current = requestAnimationFrame(() => {
        setPreviewPanelSize(size)
      })
    },
    [setPreviewPanelSize],
  )

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (sidebarResizeTimerRef.current) {
        cancelAnimationFrame(sidebarResizeTimerRef.current)
      }
      if (previewResizeTimerRef.current) {
        cancelAnimationFrame(previewResizeTimerRef.current)
      }
    }
  }, [])

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-screen flex-col bg-background text-foreground overflow-hidden">
        {/* Tab Bar */}
        <TabBar onTabChange={handleTabChange} />

        {/* Header */}
        <header
          data-tauri-drag-region
          className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-2"
        >
          {/* Breadcrumbs */}
          <Breadcrumbs className="flex-1 min-w-0" />

          {/* Toolbar */}
          <Toolbar
            onRefresh={handleRefresh}
            onNewFolder={handleNewFolder}
            onNewFile={handleNewFile}
            showPreview={layout.showPreview}
          />
        </header>

        {/* Main Content */}
        <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0">
          {/* Sidebar */}
          {layout.showSidebar && (
            <>
              <ResizablePanel
                defaultSize={layout.sidebarSize}
                minSize={4}
                maxSize={30}
                onResize={handleSidebarResize}
                className="min-w-[50px]"
              >
                <Sidebar collapsed={layout.sidebarCollapsed} className="h-full" />
              </ResizablePanel>
              <ResizableHandle withHandle />
            </>
          )}

          {/* Main Panel */}
          <ResizablePanel defaultSize={layout.mainPanelSize} minSize={30}>
            <div className="relative h-full flex flex-col min-h-0">
              <FileExplorer className="flex-1 min-h-0" />

              {/* Search Results Overlay */}
              {showSearchResults && (
                <div className="absolute inset-0 z-10 bg-background/95 backdrop-blur-sm overflow-auto">
                  <div className="p-4">
                    <h3 className="text-lg font-semibold mb-4">
                      {isSearching ? "Поиск..." : `Найдено: ${results.length}`}
                    </h3>
                    <div className="space-y-1">
                      {results.map((result) => (
                        <SearchResultItem
                          key={result.path}
                          result={result}
                          onSelect={handleSearchResultClick}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ResizablePanel>

          {/* Preview Panel */}
          {layout.showPreview && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel
                defaultSize={layout.previewPanelSize}
                minSize={15}
                maxSize={40}
                onResize={handlePreviewResize}
              >
                <PreviewPanel file={selectedFile} className="h-full" />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>

        {/* Status Bar */}
        <StatusBar />
      </div>
    </TooltipProvider>
  )
}
