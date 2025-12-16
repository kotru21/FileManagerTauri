import { useQueryClient } from "@tanstack/react-query"
import { openPath } from "@tauri-apps/plugin-opener"
import { useCallback, useEffect, useMemo } from "react"
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

export function FileBrowserPage() {
  const { currentPath, navigate } = useNavigationStore()
  const { layout, setLayout, togglePreview } = useLayoutStore()
  const { results, isSearching, query, reset: resetSearch } = useSearchStore()
  const { startNewFolder, startNewFile } = useInlineEditStore()
  const { tabs, activeTabId, addTab, updateTabPath } = useTabsStore()
  const { selectedPaths } = useSelectionStore()
  const { data: files } = useDirectoryContents(currentPath)
  const queryClient = useQueryClient()

  // Initialize first tab if none exists
  useEffect(() => {
    if (tabs.length === 0 && currentPath) {
      addTab(currentPath)
    }
  }, [tabs.length, currentPath, addTab])

  // Sync tab path with navigation
  useEffect(() => {
    if (activeTabId && currentPath) {
      updateTabPath(activeTabId, currentPath)
    }
  }, [activeTabId, currentPath, updateTabPath])

  // Handle tab changes
  const handleTabChange = useCallback(
    (path: string) => {
      if (path) {
        navigate(path)
      }
    },
    [navigate],
  )

  // Get selected file for preview
  const selectedFile: FileEntry | null = useMemo(() => {
    const paths = Array.from(selectedPaths)
    if (paths.length !== 1) return null
    return files?.find((f) => f.path === paths[0]) || null
  }, [selectedPaths, files])

  // Show search results when we have results
  const showSearchResults = (isSearching || results.length > 0) && query.length > 0

  const handleSearchResultClick = async (path: string) => {
    try {
      const result = await commands.getParentPath(path)
      if (result.status === "ok" && result.data) {
        navigate(result.data)
        // TODO: highlight file after navigation
      }
    } catch {
      // Try to open the file
      try {
        await openPath(path)
      } catch (err) {
        toast.error(`Не удалось открыть: ${err}`)
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

  const handleSearch = useCallback(() => {
    // kept for compatibility, Toolbar manages its own popover
    // No-op here
  }, [])

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-screen flex-col bg-background text-foreground pt-9">
        {/* Tab Bar */}
        <TabBar onTabChange={handleTabChange} />

        {/* Header */}
        <Toolbar
          onRefresh={handleRefresh}
          onNewFolder={handleNewFolder}
          onNewFile={handleNewFile}
          onSearch={handleSearch}
          onTogglePreview={togglePreview}
          showPreview={layout.showPreview}
        />

        {/* Breadcrumbs */}
        <Breadcrumbs className="border-b border-border px-2 py-1" />

        {/* Main Content */}
        <div className="relative flex-1 overflow-hidden">
          <ResizablePanelGroup direction="horizontal" className="h-full">
            {/* Sidebar */}
            {layout.showSidebar && (
              <>
                <ResizablePanel
                  defaultSize={layout.sidebarSize}
                  minSize={4}
                  maxSize={30}
                  onResize={(size) => {
                    const COLLAPSE_THRESHOLD = 8
                    const COLLAPSED_SIZE = 6
                    const collapsed = size < COLLAPSE_THRESHOLD
                    setLayout({
                      sidebarSize: collapsed ? COLLAPSED_SIZE : size,
                      sidebarCollapsed: collapsed,
                    })
                  }}
                >
                  <Sidebar collapsed={layout.sidebarCollapsed} />
                </ResizablePanel>
                <ResizableHandle withHandle />
              </>
            )}

            {/* Main Panel */}
            <ResizablePanel defaultSize={layout.mainPanelSize}>
              <FileExplorer />
            </ResizablePanel>

            {/* Preview Panel */}
            {layout.showPreview && (
              <>
                <ResizableHandle withHandle />
                <ResizablePanel
                  defaultSize={layout.previewPanelSize}
                  minSize={15}
                  maxSize={40}
                  onResize={(size) => setLayout({ previewPanelSize: size })}
                >
                  <PreviewPanel file={selectedFile} onClose={togglePreview} />
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>

          {/* Search Results Overlay */}
          {showSearchResults && (
            <div className="absolute inset-0 z-50 bg-background/95 backdrop-blur-sm overflow-auto">
              <div className="max-w-3xl mx-auto p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Результаты поиска ({results.length})</h2>
                  <button
                    type="button"
                    onClick={() => {
                      resetSearch()
                    }}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Закрыть
                  </button>
                </div>
                <div className="space-y-2">
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

        {/* Status Bar */}
        <StatusBar />
      </div>
    </TooltipProvider>
  )
}
