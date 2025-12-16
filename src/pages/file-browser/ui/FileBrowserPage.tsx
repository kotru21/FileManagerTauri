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

const COLLAPSE_THRESHOLD = 8
const COLLAPSED_SIZE = 4

export function FileBrowserPage() {
  const queryClient = useQueryClient()

  // Navigation
  const { currentPath, navigate } = useNavigationStore()

  // Tabs
  const { tabs, addTab, updateTabPath, getActiveTab } = useTabsStore()

  // Selection - use atomic selectors
  const lastSelectedPath = useSelectionStore((s) => s.lastSelectedPath)
  const getSelectedPaths = useSelectionStore((s) => s.getSelectedPaths)
  const clearSelection = useSelectionStore((s) => s.clearSelection)

  // Inline edit
  const { startNewFolder, startNewFile } = useInlineEditStore()

  // Layout
  const { layout, setSidebarSize, setPreviewPanelSize, setSidebarCollapsed, togglePreview } =
    useLayoutStore()

  // Settings
  const { open: openSettings } = useSettingsStore()
  const confirmDelete = useSettingsStore((s) => s.settings.confirmDelete)

  // Delete confirmation
  const { open: openDeleteConfirm } = useDeleteConfirmStore()

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
    },
    [navigate],
  )

  // Get selected file for preview - optimized to avoid Set iteration
  const previewFile = useMemo(() => {
    // Quick look takes priority
    if (quickLookFile) return quickLookFile

    // Find file by lastSelectedPath
    if (!lastSelectedPath) return null

    return filesRef.current.find((f) => f.path === lastSelectedPath) ?? null
  }, [quickLookFile, lastSelectedPath])

  // Show search results when we have results
  const showSearchResults = searchResults.length > 0 || isSearching

  // Handle search result selection
  const handleSearchResultSelect = useCallback(
    (path: string) => {
      commands.getParentPath(path).then((result) => {
        if (result.status === "ok" && result.data) {
          navigate(result.data)
          resetSearch()
          // Select the file after navigation
          setTimeout(() => {
            useSelectionStore.getState().selectFile(path)
          }, 100)
        }
      })
    },
    [navigate, resetSearch],
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
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [quickLookFile])

  // Update files ref when FileExplorer provides files
  const handleFilesChange = useCallback((files: FileEntry[]) => {
    filesRef.current = files
  }, [])

  // Immediate resize handlers (no debounce)
  const handleSidebarResize = useCallback(
    (size: number) => {
      if (size < COLLAPSE_THRESHOLD && !layout.sidebarCollapsed) {
        setSidebarCollapsed(true)
        sidebarRef.current?.resize(COLLAPSED_SIZE)
      } else if (size >= COLLAPSE_THRESHOLD && layout.sidebarCollapsed) {
        setSidebarCollapsed(false)
      }
      setSidebarSize(size)
    },
    [layout.sidebarCollapsed, setSidebarCollapsed, setSidebarSize],
  )

  const handlePreviewResize = useCallback(
    (size: number) => {
      const mainPanelSize = 100 - layout.sidebarSize - size
      if (mainPanelSize < 30) {
        const newPreviewSize = 100 - layout.sidebarSize - 30
        setPreviewPanelSize(Math.max(newPreviewSize, 15))
      } else {
        setPreviewPanelSize(size)
      }
    },
    [layout.sidebarSize, setPreviewPanelSize],
  )

  // Handlers
  const handleRefresh = useCallback(() => {
    if (currentPath) {
      queryClient.invalidateQueries({ queryKey: fileKeys.directory(currentPath) })
    }
  }, [currentPath, queryClient])

  const handleNewFolder = useCallback(() => {
    if (currentPath) startNewFolder(currentPath)
  }, [currentPath, startNewFolder])

  const handleNewFile = useCallback(() => {
    if (currentPath) startNewFile(currentPath)
  }, [currentPath, startNewFile])

  const handleDelete = useCallback(async () => {
    const selectedPaths = getSelectedPaths()
    if (selectedPaths.length === 0) return

    const performDelete = async () => {
      try {
        const result = await commands.deleteEntries(selectedPaths, false)
        if (result.status === "ok") {
          clearSelection()
          handleRefresh()
          addOperation({
            type: "delete",
            description: createOperationDescription("delete", { deletedPaths: selectedPaths }),
            data: { deletedPaths: selectedPaths },
            canUndo: false,
          })
          toast.success(`Удалено: ${selectedPaths.length} элемент(ов)`)
        } else {
          toast.error(`Ошибка удаления: ${result.error}`)
        }
      } catch (err) {
        toast.error(`Ошибка: ${err}`)
      }
    }

    if (confirmDelete) {
      const confirmed = await openDeleteConfirm(selectedPaths)
      if (confirmed) await performDelete()
    } else {
      await performDelete()
    }
  }, [
    getSelectedPaths,
    confirmDelete,
    openDeleteConfirm,
    clearSelection,
    handleRefresh,
    addOperation,
  ])

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
        <TabBar onTabChange={handleTabChange} className="shrink-0" />

        {/* Header */}
        <div className="shrink-0 border-b border-border">
          {/* Breadcrumbs */}
          <Breadcrumbs className="px-2 py-1" />

          {/* Toolbar */}
          <Toolbar
            onRefresh={handleRefresh}
            onNewFolder={handleNewFolder}
            onNewFile={handleNewFile}
            onTogglePreview={togglePreview}
            showPreview={layout.showPreview}
            className="px-2 py-1 border-t border-border"
          />
        </div>

        {/* Main Content */}
        <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0">
          {/* Sidebar */}
          {layout.showSidebar && (
            <>
              <ResizablePanel
                ref={sidebarRef}
                defaultSize={layout.sidebarSize}
                minSize={COLLAPSED_SIZE}
                maxSize={30}
                onResize={handleSidebarResize}
                className="min-w-0"
              >
                <Sidebar collapsed={layout.sidebarCollapsed} className="h-full" />
              </ResizablePanel>
              <ResizableHandle withHandle />
            </>
          )}

          {/* Main Panel */}
          <ResizablePanel defaultSize={layout.mainPanelSize} minSize={30} className="min-w-0">
            <div className="h-full relative">
              {/* Search Results Overlay */}
              {showSearchResults ? (
                <ScrollArea className="h-full">
                  <div className="p-2 space-y-1">
                    {isSearching && (
                      <div className="text-sm text-muted-foreground p-2">Поиск...</div>
                    )}
                    {searchResults.map((result) => (
                      <SearchResultItem
                        key={result.path}
                        result={result}
                        onSelect={handleSearchResultSelect}
                      />
                    ))}
                    {!isSearching && searchResults.length === 0 && (
                      <div className="text-sm text-muted-foreground p-2">Ничего не найдено</div>
                    )}
                  </div>
                </ScrollArea>
              ) : (
                <FileExplorer
                  onQuickLook={handleQuickLook}
                  onFilesChange={handleFilesChange}
                  className="h-full"
                />
              )}
            </div>
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
                className="min-w-0"
              >
                <PreviewPanel
                  file={previewFile}
                  onClose={() => setQuickLookFile(null)}
                  className="h-full"
                />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>

        {/* Status Bar */}
        <StatusBar className="shrink-0 border-t border-border" />

        {/* Global UI: Command palette, settings dialog, undo toast, delete confirm */}
        <CommandPalette />
        <SettingsDialog />
        {undoToast}
        <DeleteConfirmDialog />
      </div>
    </TooltipProvider>
  )
}
