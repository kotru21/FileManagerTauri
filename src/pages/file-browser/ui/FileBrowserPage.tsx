import { useQueryClient } from "@tanstack/react-query"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { ImperativePanelHandle } from "react-resizable-panels"
import { fileKeys } from "@/entities/file-entry"
import { CommandPalette, useRegisterCommands } from "@/features/command-palette"
import { DeleteConfirmDialog, useDeleteConfirmStore } from "@/features/delete-confirm"
import { useSelectionStore } from "@/features/file-selection"
import { useInlineEditStore } from "@/features/inline-edit"
import { useLayoutStore } from "@/features/layout"
import { useNavigationStore } from "@/features/navigation"
import {
  createOperationDescription,
  useOperationsHistoryStore,
  useUndoToast,
} from "@/features/operations-history"
import { SearchResultItem, useSearchStore } from "@/features/search-content"
import { SettingsDialog, useLayoutSettings, useSettingsStore } from "@/features/settings"
import { TabBar, useTabsStore } from "@/features/tabs"
import type { FileEntry } from "@/shared/api/tauri"
import { commands } from "@/shared/api/tauri"
import { cn } from "@/shared/lib"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  ScrollArea,
  TooltipProvider,
  toast,
} from "@/shared/ui"
import { Breadcrumbs, FileExplorer, PreviewPanel, Sidebar, StatusBar, Toolbar } from "@/widgets"

export function FileBrowserPage() {
  // Navigation
  const currentPath = useNavigationStore((s) => s.currentPath)
  const navigate = useNavigationStore((s) => s.navigate)

  // Tabs
  const tabs = useTabsStore((s) => s.tabs)
  const activeTabId = useTabsStore((s) => s.activeTabId)
  const addTab = useTabsStore((s) => s.addTab)
  const updateTabPath = useTabsStore((s) => s.updateTabPath)

  // Selection - use atomic selectors
  const selectedPaths = useSelectionStore((s) => s.selectedPaths)
  const lastSelectedPath = useSelectionStore((s) => s.lastSelectedPath)
  const clearSelection = useSelectionStore((s) => s.clearSelection)

  // Layout from settings
  const layoutSettings = useLayoutSettings()
  const { layout, setLayout, togglePreview } = useLayoutStore()

  // Sync layout store with settings
  useEffect(() => {
    setLayout({
      ...layoutSettings.panelLayout,
      columnWidths: layoutSettings.columnWidths,
    })
  }, [layoutSettings.panelLayout, layoutSettings.columnWidths, setLayout])

  // Settings
  const openSettings = useSettingsStore((s) => s.open)

  // Delete confirmation
  const openDeleteConfirm = useDeleteConfirmStore((s) => s.open)

  // Operations history
  const addOperation = useOperationsHistoryStore((s) => s.addOperation)

  // Search
  const searchResults = useSearchStore((s) => s.results)
  const isSearching = useSearchStore((s) => s.isSearching)
  const resetSearch = useSearchStore((s) => s.reset)

  // Quick Look state
  const [quickLookFile, setQuickLookFile] = useState<FileEntry | null>(null)

  // Panel refs for imperative control
  const sidebarRef = useRef<ImperativePanelHandle>(null)
  const previewRef = useRef<ImperativePanelHandle>(null)

  // Files cache for preview lookup
  const filesRef = useRef<FileEntry[]>([])

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
      navigate(path)
      clearSelection()
      resetSearch()
    },
    [navigate, clearSelection, resetSearch],
  )

  // Get selected file for preview - optimized to avoid Set iteration
  const selectedFile = useMemo(() => {
    // Quick look takes priority
    if (quickLookFile) return quickLookFile

    // Find file by lastSelectedPath
    if (lastSelectedPath && selectedPaths.size === 1) {
      return filesRef.current.find((f) => f.path === lastSelectedPath) || null
    }
    return null
  }, [quickLookFile, lastSelectedPath, selectedPaths.size])

  // Show search results when we have results
  const showSearchResults = searchResults.length > 0 || isSearching

  // Handle search result selection
  const handleSearchResultSelect = useCallback(
    (path: string) => {
      const result = searchResults.find((r) => r.path === path)
      if (result) {
        // Navigate to parent directory
        const parentPath = path.substring(0, path.lastIndexOf("\\"))
        navigate(parentPath)
        resetSearch()

        // Select the file after navigation
        setTimeout(() => {
          useSelectionStore.getState().selectFile(path)
        }, 100)
      }
    },
    [searchResults, navigate, resetSearch],
  )

  // Quick Look handler
  const handleQuickLook = useCallback(
    (file: FileEntry) => {
      setQuickLookFile(file)

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

  // Update files ref when FileExplorer provides files
  const handleFilesChange = useCallback((files: FileEntry[]) => {
    filesRef.current = files
  }, [])

  // Immediate resize handlers (no debounce)
  const handleSidebarResize = useCallback(
    (size: number) => setLayout({ sidebarSize: size }),
    [setLayout],
  )
  const handleMainResize = useCallback(
    (size: number) => setLayout({ mainPanelSize: size }),
    [setLayout],
  )
  const handlePreviewResize = useCallback(
    (size: number) => setLayout({ previewPanelSize: size }),
    [setLayout],
  )

  // Handlers
  const handleRefresh = useCallback(() => {
    if (currentPath) {
      queryClient.invalidateQueries({ queryKey: fileKeys.directory(currentPath) })
    }
  }, [currentPath, queryClient])

  const handleDelete = useCallback(async () => {
    const paths = useSelectionStore.getState().getSelectedPaths()
    if (paths.length === 0) return

    const performDelete = async () => {
      try {
        await commands.deleteEntries(paths, false)
        addOperation({
          type: "delete",
          description: createOperationDescription("delete", { deletedPaths: paths }),
          data: { deletedPaths: paths },
          canUndo: false,
        })
        clearSelection()
        handleRefresh()
        toast.success(`Удалено: ${paths.length} элемент(ов)`)
      } catch (error) {
        toast.error(`Ошибка удаления: ${error}`)
      }
    }

    const settings = useSettingsStore.getState().settings
    if (settings.behavior.confirmDelete) {
      const confirmed = await openDeleteConfirm(paths, false)
      if (confirmed) {
        await performDelete()
      }
    } else {
      await performDelete()
    }
  }, [openDeleteConfirm, addOperation, clearSelection, handleRefresh])

  // Register commands
  useRegisterCommands({
    onRefresh: handleRefresh,
    onDelete: handleDelete,
    onOpenSettings: openSettings,
  })

  // Show undo toast for last operation
  useUndoToast()

  // Calculate panel sizes
  const sidebarSize = layout.showSidebar ? layout.sidebarSize : 0
  const previewSize = layout.showPreview ? layout.previewPanelSize : 0
  const mainSize = 100 - sidebarSize - previewSize

  return (
    <TooltipProvider delayDuration={300}>
      <div className={cn("flex flex-col h-screen bg-background text-foreground")}>
        {/* Tab Bar */}
        <TabBar onTabChange={handleTabChange} />

        {/* Header */}
        <header className="flex flex-col border-b border-border shrink-0">
          {/* Breadcrumbs */}
          {layoutSettings.showBreadcrumbs && (
            <Breadcrumbs className="px-3 py-2 border-b border-border" />
          )}

          {/* Toolbar */}
          {layoutSettings.showToolbar && (
            <Toolbar
              onRefresh={handleRefresh}
              onNewFolder={() => {
                if (currentPath) {
                  useInlineEditStore.getState().startNewFolder(currentPath)
                }
              }}
              onNewFile={() => {
                if (currentPath) {
                  useInlineEditStore.getState().startNewFile(currentPath)
                }
              }}
              onTogglePreview={togglePreview}
              showPreview={layout.showPreview}
              className="px-2 py-1.5"
            />
          )}
        </header>

        {/* Main Content */}
        <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0">
          {/* Sidebar */}
          {layout.showSidebar && (
            <>
              <ResizablePanel
                ref={sidebarRef}
                defaultSize={layout.sidebarSize}
                minSize={10}
                maxSize={40}
                onResize={handleSidebarResize}
                className="bg-card"
              >
                <Sidebar collapsed={layout.sidebarCollapsed} className="h-full" />
              </ResizablePanel>
              <ResizableHandle withHandle />
            </>
          )}

          {/* Main Panel */}
          <ResizablePanel defaultSize={mainSize} minSize={30} onResize={handleMainResize}>
            {showSearchResults ? (
              /* Search Results Overlay */
              <ScrollArea className="h-full">
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">
                      Результаты поиска ({searchResults.length})
                    </h2>
                    <button
                      type="button"
                      onClick={resetSearch}
                      className="text-sm text-muted-foreground hover:text-foreground"
                    >
                      Очистить
                    </button>
                  </div>
                  {searchResults.map((result) => (
                    <SearchResultItem
                      key={result.path}
                      result={result}
                      onSelect={handleSearchResultSelect}
                    />
                  ))}
                  {isSearching && (
                    <div className="text-center text-muted-foreground py-4">Поиск...</div>
                  )}
                </div>
              </ScrollArea>
            ) : (
              <FileExplorer
                className="h-full"
                onQuickLook={handleQuickLook}
                onFilesChange={handleFilesChange}
              />
            )}
          </ResizablePanel>

          {/* Preview Panel */}
          {layout.showPreview && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel
                ref={previewRef}
                defaultSize={layout.previewPanelSize}
                minSize={15}
                maxSize={50}
                onResize={handlePreviewResize}
                className="bg-card"
              >
                <PreviewPanel
                  file={selectedFile}
                  onClose={() => setQuickLookFile(null)}
                  className={cn(quickLookFile && "ring-2 ring-primary")}
                />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>

        {/* Status Bar */}
        {layoutSettings.showStatusBar && <StatusBar className="border-t border-border" />}

        {/* Global UI: Command palette, settings dialog, undo toast, delete confirm */}
        <CommandPalette />
        <SettingsDialog />
        <DeleteConfirmDialog />
      </div>
    </TooltipProvider>
  )
}
