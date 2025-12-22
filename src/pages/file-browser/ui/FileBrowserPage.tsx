import { useQueryClient } from "@tanstack/react-query"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { PanelImperativeHandle, PanelSize } from "react-resizable-panels"
import { fileKeys } from "@/entities/file-entry"
import { CommandPalette, useRegisterCommands } from "@/features/command-palette"
import { ConfirmDialog } from "@/features/confirm"
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
import { tauriClient } from "@/shared/api/tauri/client"
import { cn } from "@/shared/lib"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  ScrollArea,
  TooltipProvider,
  toast,
} from "@/shared/ui"
import {
  Breadcrumbs,
  FileExplorer,
  PreviewPanel,
  Sidebar,
  StatusBar,
  Toolbar,
  WindowControls,
} from "@/widgets"
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
      // cancel any outstanding RAFs
      if (sidebarRafRef.current !== null) {
        window.cancelAnimationFrame(sidebarRafRef.current)
        sidebarRafRef.current = null
        sidebarPendingRef.current = null
      }
      if (previewRafRef.current !== null) {
        window.cancelAnimationFrame(previewRafRef.current)
        previewRafRef.current = null
        previewPendingRef.current = null
      }
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
  const sidebarPanelRef = useRef<PanelImperativeHandle | null>(null)
  const previewPanelRef = useRef<PanelImperativeHandle | null>(null)

  // RAF batching refs to throttle high-frequency resize events
  const sidebarPendingRef = useRef<{ size: number } | null>(null)
  const sidebarRafRef = useRef<number | null>(null)
  const previewPendingRef = useRef<{ size: number } | null>(null)
  const previewRafRef = useRef<number | null>(null)

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

  const selectFile = useSelectionStore((s) => s.selectFile)

  // Handle search result selection
  const handleSearchResultSelect = useCallback(
    async (path: string) => {
      // Navigate to parent directory
      try {
        const parentPath = await tauriClient.getParentPath(path)
        if (parentPath) {
          navigate(parentPath)
          resetSearch()

          // Select the file after navigation
          setTimeout(() => {
            selectFile(path)
          }, 100)
        }
      } catch {
        // ignore
      }
    },
    [navigate, resetSearch, selectFile],
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

  const handleFilesChange = useCallback((files: FileEntry[]) => {
    filesRef.current = files
  }, [])

  // Handlers
  const handleRefresh = useCallback(() => {
    if (currentPath) {
      queryClient.invalidateQueries({ queryKey: fileKeys.directory(currentPath) })
    }
  }, [currentPath, queryClient])

  const startNewFolder = useInlineEditStore((s) => s.startNewFolder)
  const startNewFile = useInlineEditStore((s) => s.startNewFile)

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

  const performDelete = useCallback(async () => {
    const paths = Array.from(selectedPaths)
    if (paths.length === 0) return

    const confirmed = await openDeleteConfirm(paths, false)
    if (!confirmed) return

    try {
      await tauriClient.deleteEntries(paths, false)
      toast.success(`Удалено: ${paths.length} элемент(ов)`)
      addOperation({
        type: "delete",
        description: createOperationDescription("delete", { deletedPaths: paths }),
        data: { deletedPaths: paths },
        canUndo: false,
      })
      clearSelection()
      handleRefresh()
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
        <TabBar onTabChange={handleTabChange} className="shrink-0" controls={<WindowControls />} />

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
        <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0 min-w-0">
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
                onResize={(panelSize: PanelSize) => {
                  // allow runtime resizing only when not locked
                  if (!panelLayout.sidebarSizeLocked) {
                    const size = panelSize.asPercentage

                    // Throttle updates to once per animation frame to avoid jank
                    // store pending size in a ref and apply once per RAF
                    if (!sidebarPendingRef.current) sidebarPendingRef.current = { size }
                    else sidebarPendingRef.current.size = size
                    if (sidebarRafRef.current === null) {
                      sidebarRafRef.current = window.requestAnimationFrame(() => {
                        const pending = sidebarPendingRef.current
                        sidebarPendingRef.current = null
                        sidebarRafRef.current = null
                        if (pending) {
                          setLayout({
                            sidebarSize: pending.size,
                            sidebarCollapsed: pending.size <= 4.1,
                          })
                        }
                      })
                    }
                  }
                }}
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
                onResize={(panelSize: PanelSize) => {
                  if (!panelLayout.previewSizeLocked) {
                    const size = panelSize.asPercentage

                    if (!previewPendingRef.current) previewPendingRef.current = { size }
                    else previewPendingRef.current.size = size

                    if (previewRafRef.current === null) {
                      previewRafRef.current = window.requestAnimationFrame(() => {
                        const pending = previewPendingRef.current
                        previewPendingRef.current = null
                        previewRafRef.current = null
                        if (pending) setLayout({ previewPanelSize: pending.size })
                      })
                    }
                  }
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
        <ConfirmDialog />
      </div>
    </TooltipProvider>
  )
}
