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
import { useSyncLayoutWithSettings } from "../hooks/useSyncLayoutWithSettings"

export function FileBrowserPage() {
  // Navigation
  const { currentPath, navigate } = useNavigationStore()

  // Tabs
  const { tabs, addTab, updateTabPath, getActiveTab } = useTabsStore()

  // Selection - use atomic selectors
  const selectedPaths = useSelectionStore((s) => s.selectedPaths)
  const lastSelectedPath = useSelectionStore((s) => s.lastSelectedPath)
  const clearSelection = useSelectionStore((s) => s.clearSelection)

  // Layout from settings
  const layoutSettings = useLayoutSettings()
  const { layout: panelLayout, setLayout } = useLayoutStore()

  // Sync layout store with settings (encapsulated in a hook)
  // This handles initial sync, applying presets/custom layouts, column widths and persisting
  // back to settings when changes occur.
  // The hook avoids DOM operations so it's safe to unit-test in isolation.
  useSyncLayoutWithSettings()

  // Register panel refs with the panel controller so DOM imperative calls are centralized
  useEffect(() => {
    // Use dynamic import to avoid requiring Node-style `require` and to keep this code browser-safe.
    let mounted = true
    let cleanup = () => {}

    ;(async () => {
      const mod = await import("@/features/layout/panelController")
      if (!mounted) return
      mod.registerSidebar(sidebarPanelRef)
      mod.registerPreview(previewPanelRef)

      cleanup = () => {
        try {
          mod.registerSidebar(null)
          mod.registerPreview(null)
        } catch {
          /* ignore */
        }
      }
    })()

    return () => {
      mounted = false
      cleanup()
    }
  }, [])

  // Settings
  const openSettings = useSettingsStore((s) => s.open)

  // Delete confirmation
  const openDeleteConfirm = useDeleteConfirmStore((s) => s.open)

  // Operations history
  const addOperation = useOperationsHistoryStore((s) => s.addOperation)

  // Search
  const { results: searchResults, isSearching, reset: resetSearch } = useSearchStore()

  // Quick Look state
  const [quickLookFile, setQuickLookFile] = useState<FileEntry | null>(null)

  // Panel refs for imperative control
  const sidebarPanelRef = useRef<ImperativePanelHandle>(null)
  const previewPanelRef = useRef<ImperativePanelHandle>(null)

  // Files cache for preview lookup
  const filesRef = useRef<FileEntry[]>([])

  // Query client for invalidation
  const queryClient = useQueryClient()

  // Initialize first tab if none exists
  useEffect(() => {
    if (tabs.length === 0 && currentPath) {
      addTab(currentPath)
    }
  }, [tabs.length, currentPath, addTab])

  // Sync tab path with navigation
  useEffect(() => {
    const activeTab = getActiveTab()
    if (activeTab && currentPath && activeTab.path !== currentPath) {
      updateTabPath(activeTab.id, currentPath)
    }
  }, [currentPath, getActiveTab, updateTabPath])

  // Handle tab changes
  const handleTabChange = useCallback(
    (path: string) => {
      navigate(path)
      resetSearch()
    },
    [navigate, resetSearch],
  )

  // Get selected file for preview - optimized to avoid Set iteration
  const selectedFile = useMemo(() => {
    // Quick look takes priority
    if (quickLookFile) return quickLookFile

    // Find file by lastSelectedPath
    if (lastSelectedPath && filesRef.current.length > 0) {
      return filesRef.current.find((f) => f.path === lastSelectedPath) ?? null
    }
    return null
  }, [quickLookFile, lastSelectedPath])

  // Show search results when we have results
  const showSearchResults = searchResults.length > 0 || isSearching

  // Handle search result selection
  const handleSearchResultSelect = useCallback(
    async (path: string) => {
      // Navigate to parent directory
      const result = await commands.getParentPath(path)
      if (result.status === "ok" && result.data) {
        navigate(result.data)
        resetSearch()

        // Select the file after navigation
        setTimeout(() => {
          useSelectionStore.getState().selectFile(path)
        }, 100)
      }
    },
    [navigate, resetSearch],
  )

  // Quick Look handler
  const handleQuickLook = useCallback(
    (file: FileEntry) => {
      setQuickLookFile(file)
      // Show preview panel if hidden
      setLayout({ showPreview: true })
    },
    [setLayout],
  )

  // Close Quick Look on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && quickLookFile) {
        setQuickLookFile(null)
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [quickLookFile])

  // Update files ref when FileExplorer provides files
  const handleFilesChange = useCallback((files: FileEntry[]) => {
    filesRef.current = files
  }, [])

  // Handlers
  const handleRefresh = useCallback(() => {
    if (currentPath) {
      queryClient.invalidateQueries({ queryKey: fileKeys.directory(currentPath) })
    }
  }, [currentPath, queryClient])

  const handleNewFolder = useCallback(() => {
    if (currentPath) {
      useInlineEditStore.getState().startNewFolder(currentPath)
    }
  }, [currentPath])

  const handleNewFile = useCallback(() => {
    if (currentPath) {
      useInlineEditStore.getState().startNewFile(currentPath)
    }
  }, [currentPath])

  const performDelete = useCallback(async () => {
    const paths = Array.from(selectedPaths)
    if (paths.length === 0) return

    const confirmed = await openDeleteConfirm(paths, false)
    if (!confirmed) return

    try {
      const result = await commands.deleteEntries(paths, false)
      if (result.status === "ok") {
        toast.success(`Удалено: ${paths.length} элемент(ов)`)
        addOperation({
          type: "delete",
          description: createOperationDescription("delete", { deletedPaths: paths }),
          data: { deletedPaths: paths },
          canUndo: false,
        })
        clearSelection()
        handleRefresh()
      } else {
        toast.error(`Ошибка: ${result.error}`)
      }
    } catch (error) {
      toast.error(`Ошибка удаления: ${error}`)
    }
  }, [selectedPaths, openDeleteConfirm, addOperation, clearSelection, handleRefresh])

  // Register commands
  useRegisterCommands({
    onRefresh: handleRefresh,
    onDelete: performDelete,
    onOpenSettings: openSettings,
  })

  // Show undo toast for last operation
  useUndoToast((operation) => {
    // Handle undo based on operation type
    toast.info(`Отмена: ${operation.description}`)
  })

  // Toggle preview
  const handleTogglePreview = useCallback(() => {
    setLayout({ showPreview: !panelLayout.showPreview })
  }, [panelLayout.showPreview, setLayout])

  // Compute a sensible default size for main panel to avoid invalid total sums
  const mainDefaultSize = (() => {
    const sidebar = panelLayout.showSidebar ? panelLayout.sidebarSize : 0
    const preview = panelLayout.showPreview ? panelLayout.previewPanelSize : 0

    if (panelLayout.showSidebar && panelLayout.showPreview) {
      return Math.max(10, 100 - sidebar - preview)
    }
    if (panelLayout.showSidebar) return Math.max(30, 100 - sidebar)
    if (panelLayout.showPreview) return Math.max(30, 100 - preview)
    return 100
  })()

  return (
    <TooltipProvider>
      <div
        className={cn(
          "flex flex-col h-screen bg-background text-foreground overflow-hidden",
          layoutSettings.compactMode && "compact-mode",
        )}
      >
        {/* Tab Bar */}
        <TabBar onTabChange={handleTabChange} className="shrink-0" />

        {/* Header */}
        <div className="shrink-0">
          {/* Breadcrumbs */}
          {layoutSettings.showBreadcrumbs && (
            <div className="px-3 py-2 border-b">
              <Breadcrumbs />
            </div>
          )}

          {/* Toolbar */}
          {layoutSettings.showToolbar && (
            <Toolbar
              onRefresh={handleRefresh}
              onNewFolder={handleNewFolder}
              onNewFile={handleNewFile}
              onTogglePreview={handleTogglePreview}
              showPreview={panelLayout.showPreview}
            />
          )}
        </div>

        {/* Main Content */}
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {/* Sidebar */}
          {panelLayout.showSidebar && (
            <>
              <ResizablePanel
                // When size is locked, remount panel on size change so defaultSize is applied
                key={
                  panelLayout.sidebarSizeLocked ? `sidebar-${panelLayout.sidebarSize}` : undefined
                }
                ref={sidebarPanelRef}
                defaultSize={panelLayout.sidebarSize}
                minSize={10}
                maxSize={30}
                collapsible
                collapsedSize={4}
                onResize={(size) => {
                  // allow runtime resizing only when not locked
                  if (!panelLayout.sidebarSizeLocked)
                    setLayout({ sidebarSize: size, sidebarCollapsed: size <= 4.1 })
                }}
                onCollapse={() => setLayout({ sidebarCollapsed: true })}
                onExpand={() => setLayout({ sidebarCollapsed: false })}
              >
                <Sidebar collapsed={panelLayout.sidebarCollapsed} />
              </ResizablePanel>
              {!panelLayout.sidebarSizeLocked && <ResizableHandle withHandle />}
            </>
          )}

          <ResizablePanel defaultSize={mainDefaultSize} minSize={30}>
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
              <FileExplorer onQuickLook={handleQuickLook} onFilesChange={handleFilesChange} />
            )}
          </ResizablePanel>

          {/* Preview Panel */}
          {panelLayout.showPreview && (
            <>
              {!panelLayout.previewSizeLocked && <ResizableHandle withHandle />}
              <ResizablePanel
                key={
                  panelLayout.previewSizeLocked
                    ? `preview-${panelLayout.previewPanelSize}`
                    : undefined
                }
                ref={previewPanelRef}
                defaultSize={panelLayout.previewPanelSize}
                minSize={15}
                maxSize={40}
                onResize={(size) => {
                  if (!panelLayout.previewSizeLocked) setLayout({ previewPanelSize: size })
                }}
              >
                <PreviewPanel file={selectedFile} onClose={() => setQuickLookFile(null)} />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>

        {/* Status Bar */}
        {layoutSettings.showStatusBar && <StatusBar />}

        {/* Global UI: Command palette, settings dialog, delete confirm */}
        <CommandPalette />
        <SettingsDialog />
        <DeleteConfirmDialog />
      </div>
    </TooltipProvider>
  )
}
