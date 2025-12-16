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
import { SettingsDialog, useSettingsStore } from "@/features/settings"
import { TabBar, useTabsStore } from "@/features/tabs"
import type { FileEntry } from "@/shared/api/tauri"
import { commands } from "@/shared/api/tauri"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  ScrollArea,
  TooltipProvider,
  toast,
} from "@/shared/ui"
import { Breadcrumbs, FileExplorer, PreviewPanel, Sidebar, StatusBar, Toolbar } from "@/widgets"

// Threshold constants
const COLLAPSE_THRESHOLD = 8 // percent
const COLLAPSED_SIZE = 4 // percent when collapsed

export function FileBrowserPage() {
  const queryClient = useQueryClient()

  // Navigation
  const { currentPath, navigate } = useNavigationStore()

  // Tabs
  const { tabs, activeTabId, addTab, updateTabPath } = useTabsStore()

  // Selection
  const { selectedPaths, clearSelection, selectFile } = useSelectionStore()

  // Inline edit
  const { startNewFolder, startNewFile } = useInlineEditStore()

  // Layout
  const { layout, setLayout, setSidebarCollapsed } = useLayoutStore()

  // Settings
  const { settings, open: openSettings } = useSettingsStore()

  // Delete confirmation
  const { open: openDeleteConfirm } = useDeleteConfirmStore()

  // Operations history
  const { addOperation } = useOperationsHistoryStore()

  // Search
  const { results: searchResults, isSearching, reset: resetSearch } = useSearchStore()

  // Quick Look state
  const [quickLookFile, setQuickLookFile] = useState<FileEntry | null>(null)

  // Panel refs for imperative control
  const sidebarPanelRef = useRef<ImperativePanelHandle>(null)
  const previewPanelRef = useRef<ImperativePanelHandle>(null)

  // Initialize first tab if none exists
  useEffect(() => {
    if (tabs.length === 0) {
      addTab(currentPath ?? "C:\\")
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
      clearSelection()
      resetSearch()
    },
    [navigate, clearSelection, resetSearch],
  )

  // Get selected file for preview
  const selectedFile = useMemo(() => {
    const paths = Array.from(selectedPaths)
    if (paths.length === 1) {
      return paths[0]
    }
    return null
  }, [selectedPaths])

  // Use quick look file for preview if active, otherwise use selected file
  const previewFile = quickLookFile ?? (selectedFile ? { path: selectedFile } : null)

  // Show search results when we have results
  const showSearchResults = searchResults.length > 0 || isSearching

  const handleSearchResultClick = useCallback(
    async (path: string) => {
      try {
        const result = await commands.getParentPath(path)
        if (result.status === "ok" && result.data) {
          navigate(result.data)
          resetSearch()
          // Select the file after navigation
          setTimeout(() => {
            selectFile(path)
          }, 100)
        }
      } catch {
        toast.error("Failed to navigate to file")
      }
    },
    [navigate, resetSearch, selectFile],
  )

  // Quick Look handler
  const handleQuickLook = useCallback(
    (file: FileEntry) => {
      setQuickLookFile(file)
      // Show preview panel if hidden
      if (!layout.showPreview) {
        setLayout({ showPreview: true })
      }
    },
    [layout.showPreview, setLayout],
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

  // Immediate resize handlers (no debounce)
  const handleSidebarResize = useCallback(
    (size: number) => {
      const shouldCollapse = size < COLLAPSE_THRESHOLD
      const currentlyCollapsed = layout.sidebarCollapsed ?? false

      if (shouldCollapse !== currentlyCollapsed) {
        setSidebarCollapsed(shouldCollapse)
      }

      // Calculate new sizes ensuring they sum to 100%
      const previewSize = layout.showPreview ? layout.previewPanelSize : 0
      const newMainSize = 100 - size - previewSize

      if (newMainSize < 30 && layout.showPreview) {
        // If main panel would be too small, reduce preview
        const adjustedPreview = Math.max(15, 100 - size - 30)
        setLayout({
          sidebarSize: size,
          mainPanelSize: 30,
          previewPanelSize: adjustedPreview,
        })
      } else {
        setLayout({
          sidebarSize: size,
          mainPanelSize: Math.max(30, newMainSize),
        })
      }
    },
    [
      layout.sidebarCollapsed,
      layout.showPreview,
      layout.previewPanelSize,
      setSidebarCollapsed,
      setLayout,
    ],
  )

  const handlePreviewResize = useCallback(
    (size: number) => {
      const sidebarSize = layout.showSidebar ? layout.sidebarSize : 0
      const newMainSize = 100 - sidebarSize - size

      setLayout({
        previewPanelSize: size,
        mainPanelSize: Math.max(30, newMainSize),
      })
    },
    [layout.showSidebar, layout.sidebarSize, setLayout],
  )

  // Handlers
  const handleRefresh = useCallback(() => {
    if (currentPath) {
      queryClient.invalidateQueries({ queryKey: fileKeys.directory(currentPath) })
    }
  }, [currentPath, queryClient])

  const handleDelete = useCallback(async () => {
    const paths = Array.from(selectedPaths)
    if (paths.length === 0) return

    // Show confirmation if enabled
    if (settings.confirmDelete) {
      const confirmed = await openDeleteConfirm(paths, false)
      if (!confirmed) return
    }

    try {
      await commands.deleteEntries(paths, false)
      clearSelection()
      handleRefresh()

      addOperation({
        type: "delete",
        description: createOperationDescription("delete", { deletedPaths: paths }),
        data: { deletedPaths: paths },
        canUndo: false, // Deletion not undoable from app (recycle bin)
      })

      toast.success(`Deleted ${paths.length} item(s)`)
    } catch (err) {
      toast.error(`Failed to delete: ${err}`)
    }
  }, [
    selectedPaths,
    settings.confirmDelete,
    openDeleteConfirm,
    clearSelection,
    handleRefresh,
    addOperation,
  ])

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

  const handleTogglePreview = useCallback(() => {
    setLayout({ showPreview: !layout.showPreview })
  }, [layout.showPreview, setLayout])

  // Register commands
  useRegisterCommands({
    onRefresh: handleRefresh,
    onDelete: handleDelete,
    onOpenSettings: openSettings,
  })

  // Show undo toast for last operation
  const { toast: undoToast } = useUndoToast()

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
        {/* Tab Bar */}
        <TabBar onTabChange={handleTabChange} />

        {/* Header */}
        <div className="shrink-0 border-b border-border">
          {/* Breadcrumbs */}
          <Breadcrumbs className="px-2 py-1" />

          {/* Toolbar */}
          <Toolbar
            onRefresh={handleRefresh}
            onNewFolder={handleNewFolder}
            onNewFile={handleNewFile}
            onTogglePreview={handleTogglePreview}
            showPreview={layout.showPreview}
            className="px-2 py-1 border-t border-border"
          />
        </div>

        {/* Main Content */}
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {/* Sidebar */}
          {layout.showSidebar && (
            <>
              <ResizablePanel
                ref={sidebarPanelRef}
                defaultSize={layout.sidebarSize}
                minSize={COLLAPSED_SIZE}
                maxSize={30}
                onResize={handleSidebarResize}
              >
                <Sidebar collapsed={layout.sidebarCollapsed} className="h-full" />
              </ResizablePanel>
              <ResizableHandle withHandle />
            </>
          )}

          {/* Main Panel */}
          <ResizablePanel defaultSize={layout.mainPanelSize} minSize={30}>
            <div className="h-full relative">
              {/* Search Results Overlay */}
              {showSearchResults && (
                <div className="absolute inset-0 z-10 bg-background">
                  <ScrollArea className="h-full">
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold">
                          Search Results ({searchResults.length})
                        </h2>
                        <button
                          type="button"
                          onClick={resetSearch}
                          className="text-sm text-muted-foreground hover:text-foreground"
                        >
                          Clear
                        </button>
                      </div>
                      <div className="space-y-1">
                        {searchResults.map((result) => (
                          <SearchResultItem
                            key={result.path}
                            result={result}
                            onSelect={handleSearchResultClick}
                          />
                        ))}
                      </div>
                      {isSearching && (
                        <div className="text-center py-4 text-muted-foreground">Searching...</div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              )}

              <FileExplorer onQuickLook={handleQuickLook} className="h-full" />
            </div>
          </ResizablePanel>

          {/* Preview Panel */}
          {layout.showPreview && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel
                ref={previewPanelRef}
                defaultSize={layout.previewPanelSize}
                minSize={15}
                maxSize={50}
                onResize={handlePreviewResize}
              >
                <PreviewPanel
                  file={previewFile as FileEntry | null}
                  onClose={() => {
                    setQuickLookFile(null)
                    setLayout({ showPreview: false })
                  }}
                  className="h-full"
                />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>

        {/* Status Bar */}
        <StatusBar className="shrink-0" />

        {/* Global UI: Command palette, settings dialog, undo toast, delete confirm */}
        <CommandPalette />
        <SettingsDialog />
        {undoToast}
        <DeleteConfirmDialog />
      </div>
    </TooltipProvider>
  )
}
