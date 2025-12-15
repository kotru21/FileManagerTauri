// src/pages/file-browser/ui/FileBrowserPage.tsx

import { useQueryClient } from "@tanstack/react-query"
import { openPath } from "@tauri-apps/plugin-opener"
import { useCallback, useEffect, useState } from "react"
import { fileKeys } from "@/entities/file-entry"
import { useInlineEditStore } from "@/features/inline-edit"
import { useLayoutStore } from "@/features/layout"
import { useNavigationStore } from "@/features/navigation"
import { SearchBar, SearchResultItem, useSearchStore } from "@/features/search-content"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  TooltipProvider,
  toast,
} from "@/shared/ui"
import { Breadcrumbs, FileExplorer, Sidebar, StatusBar, Toolbar } from "@/widgets"

export function FileBrowserPage() {
  const queryClient = useQueryClient()
  const { currentPath, navigate } = useNavigationStore()
  const { layout, setSidebarSize, setMainPanelSize } = useLayoutStore()
  const { results, reset: resetSearch } = useSearchStore()
  const { startNewFolder, startNewFile } = useInlineEditStore()

  const [showSearchResults, setShowSearchResults] = useState(false)

  // Show search results when we have results
  useEffect(() => {
    if (results.length > 0) {
      setShowSearchResults(true)
    }
  }, [results])

  const handleRefresh = useCallback(() => {
    if (currentPath) {
      queryClient.invalidateQueries({
        queryKey: fileKeys.directory(currentPath),
      })
    }
  }, [queryClient, currentPath])

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
    setShowSearchResults(true)
  }, [])

  const handleCloseSearch = useCallback(() => {
    setShowSearchResults(false)
    resetSearch()
  }, [resetSearch])

  const handleSelectSearchResult = useCallback(
    async (path: string) => {
      try {
        // Navigate to parent directory and highlight file
        const parentPath = path.substring(0, path.lastIndexOf("\\"))
        if (parentPath && parentPath !== currentPath) {
          navigate(parentPath)
        }
        // Try to open the file
        await openPath(path)
      } catch (error) {
        toast.error(`Не удалось открыть: ${error}`)
      }
    },
    [currentPath, navigate],
  )

  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen bg-background text-foreground">
        {/* Header */}
        <div className="shrink-0 border-b border-border">
          <Toolbar
            onRefresh={handleRefresh}
            onNewFolder={handleNewFolder}
            onNewFile={handleNewFile}
            onSearch={handleSearch}
            className="px-2 py-1"
          />
          <Breadcrumbs className="px-2 py-1 border-t border-border" />
        </div>

        {/* Search Bar - фиксированная позиция */}
        <div className="shrink-0 border-b border-border px-2 py-1">
          <SearchBar onSearch={handleSearch} />
        </div>

        {/* Main Content - relative для overlay */}
        <div className="flex-1 min-h-0 relative">
          {/* Search Results Overlay */}
          {showSearchResults && results.length > 0 && (
            <div className="absolute inset-0 z-10 bg-background/95 backdrop-blur-sm overflow-auto">
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Результаты поиска ({results.length})</h2>
                  <button
                    type="button"
                    onClick={handleCloseSearch}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    ✕ Закрыть
                  </button>
                </div>
                <div className="space-y-1">
                  {results.map((result) => (
                    <SearchResultItem
                      key={result.path}
                      result={result}
                      onSelect={handleSelectSearchResult}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          <ResizablePanelGroup direction="horizontal" className="h-full">
            {layout.showSidebar && (
              <>
                <ResizablePanel
                  defaultSize={layout.sidebarSize}
                  minSize={10}
                  maxSize={30}
                  onResize={setSidebarSize}
                >
                  <Sidebar className="h-full" />
                </ResizablePanel>
                <ResizableHandle withHandle />
              </>
            )}

            <ResizablePanel
              defaultSize={layout.mainPanelSize}
              minSize={30}
              onResize={setMainPanelSize}
            >
              <FileExplorer className="h-full" />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>

        {/* Status Bar */}
        <StatusBar className="shrink-0 border-t border-border px-2 py-1" />
      </div>
    </TooltipProvider>
  )
}
