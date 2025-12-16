import { useQueryClient } from "@tanstack/react-query"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { fileKeys } from "@/entities/file-entry"
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

export function FileBrowserPage() {
  const queryClient = useQueryClient()
  const { currentPath, navigate } = useNavigationStore()
  const { layout, setSidebarSize, setMainPanelSize, setPreviewPanelSize, togglePreview, setSidebarCollapsed } =
    useLayoutStore()
  const { tabs, activeTabId, addTab, updateTabPath } = useTabsStore()
  const { results: searchResults, isSearching, query: searchQuery } = useSearchStore()
  const { clearSelection, getSelectedPaths } = useSelectionStore()
  const { startNewFolder, startNewFile } = useInlineEditStore()

  // Quick Look state
  const [quickLookFile, setQuickLookFile] = useState<FileEntry | null>(null)

  // Debounce refs for resize
  const sidebarResizeTimer = useRef<ReturnType<typeof setTimeout>>()
  const mainResizeTimer = useRef<ReturnType<typeof setTimeout>>()
  const previewResizeTimer = useRef<ReturnType<typeof setTimeout>>()

  // Initialize first tab if none exists
  useEffect(() => {
    if (tabs.length === 0) {
      const initialPath = currentPath || "C:\\"
      addTab(initialPath)
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
  const selectedFile = useMemo(() => {
    const paths = getSelectedPaths()
    if (paths.length !== 1) return null

    return queryClient
      .getQueryData<FileEntry[]>(fileKeys.directory(currentPath || ""))
      ?.find((f) => f.path === paths[0])
  }, [currentPath, queryClient, getSelectedPaths])

  // Use quick look file for preview if active, otherwise use selected file
  const previewFile = quickLookFile || selectedFile

  // Show search results when we have results
  const showSearchResults = searchResults.length > 0 || isSearching

  const handleSearchResultClick = async (path: string) => {
    try {
      const parentResult = await commands.getParentPath(path)
      if (parentResult.status === "ok" && parentResult.data) {
        navigate(parentResult.data)
        clearSelection()
        // Select the file after navigation
        setTimeout(() => {
          useSelectionStore.getState().selectFile(path)
        }, 100)
      }
    } catch {
      toast.error("Ошибка открытия файла")
    }
  }

  // Quick Look handler
  const handleQuickLook = useCallback(
    (file: FileEntry) => {
      setQuickLookFile((prev) => (prev?.path === file.path ? null : file))
      // Show preview panel if hidden
      if (!layout.showPreview) {
        togglePreview()
      }
    },
    [layout.showPreview, togglePreview],
  )

  // Close Quick Look on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && quickLookFile) {
        setQuickLookFile(null)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [quickLookFile])

  // Debounced resize handlers
  const COLLAPSE_THRESHOLD = 8 // percent
  const COLLAPSED_SIZE = 4 // percent when collapsed

  const handleSidebarResize = useCallback(
    (size: number) => {
      clearTimeout(sidebarResizeTimer.current)
      sidebarResizeTimer.current = setTimeout(() => {
        const collapsed = size < COLLAPSE_THRESHOLD

        // Toggle collapsed flag based on threshold
        setSidebarCollapsed(collapsed)

        const newSidebarSize = collapsed ? COLLAPSED_SIZE : size

        // Ensure remaining panels sum to 100% by adjusting main panel
        const previewSize = layout.showPreview ? layout.previewPanelSize : 0
        let newMain = Math.max(30, 100 - newSidebarSize - previewSize)

        // If preview exists and main became too small, reduce preview to accommodate
        if (layout.showPreview) {
          const remaining = 100 - newSidebarSize - newMain
          const newPreview = Math.max(15, remaining)
          setPreviewPanelSize(newPreview)
          // Recompute main if preview consumed space
          newMain = Math.max(30, 100 - newSidebarSize - newPreview)
        }

        setSidebarSize(newSidebarSize)
        setMainPanelSize(newMain)
      }, 100)
    },
    [setSidebarSize, setSidebarCollapsed, setMainPanelSize, setPreviewPanelSize, layout.showPreview, layout.previewPanelSize],
  )

  const handleMainResize = useCallback(
    (size: number) => {
      clearTimeout(mainResizeTimer.current)
      mainResizeTimer.current = setTimeout(() => {
        setMainPanelSize(size)
      }, 100)
    },
    [setMainPanelSize],
  )

  const handlePreviewResize = useCallback(
    (size: number) => {
      clearTimeout(previewResizeTimer.current)
      previewResizeTimer.current = setTimeout(() => {
        setPreviewPanelSize(size)
      }, 100)
    },
    [setPreviewPanelSize],
  )

  // Normalize layout on mount / when layout changes so panels sum to 100%
  useEffect(() => {
    const sidebar = layout.showSidebar ? (layout.sidebarCollapsed ? COLLAPSED_SIZE : layout.sidebarSize) : 0
    const preview = layout.showPreview ? layout.previewPanelSize : 0
    const total = sidebar + layout.mainPanelSize + preview

    if (Math.abs(total - 100) > 0.1) {
      const newMain = Math.max(30, 100 - sidebar - preview)
      setMainPanelSize(newMain)
    }
  }, [layout.showSidebar, layout.sidebarCollapsed, layout.sidebarSize, layout.mainPanelSize, layout.showPreview, layout.previewPanelSize, setMainPanelSize])

  // Cleanup timers
  useEffect(() => {
    return () => {
      clearTimeout(sidebarResizeTimer.current)
      clearTimeout(mainResizeTimer.current)
      clearTimeout(previewResizeTimer.current)
    }
  }, [])

  const handleRefresh = useCallback(() => {
    if (currentPath) {
      queryClient.invalidateQueries({ queryKey: fileKeys.directory(currentPath) })
    }
  }, [currentPath, queryClient])

  return (
    <TooltipProvider delayDuration={300}>
      <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
        {/* Tab Bar */}
        <TabBar onTabChange={handleTabChange} className="shrink-0" />

        {/* Header */}
        <header className="shrink-0 flex flex-col border-b border-border">
          {/* Breadcrumbs */}
          <div className="px-3 py-2 border-b border-border">
            <Breadcrumbs />
          </div>

          {/* Toolbar */}
          <Toolbar
            onRefresh={handleRefresh}
            onNewFolder={() => currentPath && startNewFolder(currentPath)}
            onNewFile={() => currentPath && startNewFile(currentPath)}
            onTogglePreview={togglePreview}
            showPreview={layout.showPreview}
            className="px-2 py-1"
          />
        </header>

        {/* Main Content */}
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {/* Sidebar */}
          {layout.showSidebar && (
            <>
              <ResizablePanel
                defaultSize={layout.sidebarCollapsed ? 4 : layout.sidebarSize}
                minSize={4}
                maxSize={30}
                onResize={handleSidebarResize}
              >
                <Sidebar collapsed={layout.sidebarCollapsed} />
              </ResizablePanel>
              <ResizableHandle withHandle />
            </>
          )}

          {/* Main Panel */}
          <ResizablePanel
            defaultSize={layout.mainPanelSize}
            minSize={30}
            onResize={handleMainResize}
          >
            <div className="h-full relative">
              <FileExplorer onQuickLook={handleQuickLook} />

              {/* Search Results Overlay */}
              {showSearchResults && (
                <div className="absolute inset-0 bg-background/95 backdrop-blur-sm overflow-auto p-4">
                  <div className="max-w-2xl mx-auto">
                    <h2 className="text-lg font-semibold mb-4">
                      {isSearching ? "Поиск..." : `Результаты поиска "${searchQuery}"`}
                    </h2>
                    {searchResults.map((result) => (
                      <SearchResultItem
                        key={result.path}
                        result={result}
                        onSelect={handleSearchResultClick}
                      />
                    ))}
                    {!isSearching && searchResults.length === 0 && (
                      <p className="text-muted-foreground">Ничего не найдено</p>
                    )}
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
                maxSize={50}
                onResize={handlePreviewResize}
              >
                <PreviewPanel
                  file={previewFile}
                  onClose={() => {
                    setQuickLookFile(null)
                    if (!selectedFile) {
                      togglePreview()
                    }
                  }}
                />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>

        {/* Status Bar */}
        <StatusBar className="shrink-0" />
      </div>
    </TooltipProvider>
  )
}
