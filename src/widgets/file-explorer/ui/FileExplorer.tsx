import { useCallback, useEffect, useMemo } from "react"
import { filterEntries, useFileWatcher } from "@/entities/file-entry"
import { useClipboardStore } from "@/features/clipboard"
import { FileContextMenu } from "@/features/context-menu"
import { useDeleteConfirmStore } from "@/features/delete-confirm"
import { useSelectionStore } from "@/features/file-selection"
import { useLayoutStore } from "@/features/layout"
import { useNavigationStore } from "@/features/navigation"
import { QuickFilterBar, useQuickFilterStore } from "@/features/quick-filter"
import { useBehaviorSettings, useLayoutSettings, usePerformanceSettings } from "@/features/settings"
import { useViewModeStore } from "@/features/view-mode"
import type { FileEntry } from "@/shared/api/tauri"
import { cn } from "@/shared/lib"
import { toast } from "@/shared/ui"
import { CopyProgressDialog } from "@/widgets/progress-dialog"
import { useFileExplorerKeyboard, useFileExplorerLogic } from "../lib"
import { FileExplorerView } from "./FileExplorer.view"

interface FileExplorerProps {
  className?: string
  onQuickLook?: (file: FileEntry) => void
  onFilesChange?: (files: FileEntry[]) => void
}

export function FileExplorer({ className, onQuickLook, onFilesChange }: FileExplorerProps) {
  const { currentPath } = useNavigationStore()
  const { settings: viewSettings } = useViewModeStore()

  const behaviorSettings = useBehaviorSettings()
  const layoutSettings = useLayoutSettings()

  const { filter: quickFilter, isActive: isQuickFilterActive } = useQuickFilterStore()

  const selectedPaths = useSelectionStore((s) => s.selectedPaths)
  const clearSelection = useSelectionStore((s) => s.clearSelection)
  const getSelectedPaths = useSelectionStore((s) => s.getSelectedPaths)

  // Layout selectors to avoid getState() in render
  const columnWidths = useLayoutStore((s) => s.layout.columnWidths)
  const setColumnWidth = useLayoutStore((s) => s.setColumnWidth)

  const clipboardHasContent = useClipboardStore((s) => s.hasContent)

  const {
    files: processedFiles,
    processedFilesCount,
    isLoading,
    refetch,
    handlers,
    copyDialogOpen,
    setCopyDialogOpen,
    displaySettings,
    appearance,
    sortConfig,
    setSortField,
  } = useFileExplorerLogic(currentPath, onQuickLook, onFilesChange)

  const files = useMemo(() => {
    if (!isQuickFilterActive || !quickFilter) return processedFiles

    return filterEntries(processedFiles, {
      showHidden: displaySettings.showHiddenFiles,
      searchQuery: quickFilter,
    })
  }, [processedFiles, isQuickFilterActive, quickFilter, displaySettings.showHiddenFiles])

  // File watcher
  useFileWatcher(currentPath)

  useEffect(() => {
    if (!behaviorSettings.autoRefreshOnFocus) return

    const handleFocus = () => {
      refetch()
    }

    window.addEventListener("focus", handleFocus)
    return () => window.removeEventListener("focus", handleFocus)
  }, [behaviorSettings.autoRefreshOnFocus, refetch])

  // handlers provided by useFileExplorerLogic

  const openDeleteConfirm = useDeleteConfirmStore((s) => s.open)

  // Delete handler with confirmation based on settings
  const handleDelete = useCallback(async () => {
    const paths = getSelectedPaths()
    if (paths.length === 0) return

    // Use confirmDelete from behaviorSettings
    if (behaviorSettings.confirmDelete) {
      const confirmed = await openDeleteConfirm(paths, false)
      if (!confirmed) return
    }

    try {
      await handlers.handleDelete()
    } catch (error) {
      toast.error(`Ошибка удаления: ${error}`)
    }
  }, [getSelectedPaths, behaviorSettings.confirmDelete, openDeleteConfirm, handlers])

  // Quick Look handler
  const handleQuickLook = useCallback(() => {
    const paths = getSelectedPaths()
    if (paths.length !== 1) return

    const file = files.find((f) => f.path === paths[0])
    if (file) {
      onQuickLook?.(file)
    }
  }, [getSelectedPaths, files, onQuickLook])

  // Keyboard shortcuts
  useFileExplorerKeyboard({
    files,
    onCopy: handlers.handleCopy,
    onCut: handlers.handleCut,
    onPaste: handlers.handlePaste,
    onDelete: handleDelete,
    onStartNewFolder: handlers.handleStartNewFolder,
    onStartRename: handlers.handleStartRename,
    onRefresh: () => refetch(),
    onQuickLook: handleQuickLook,
  })

  const performanceSettings = usePerformanceSettings()

  // Use separate view component to keep FileExplorer container-focused
  useEffect(() => {
    import("./FileExplorer.view").then(() => {})
  }, [])

  const content = (
    <FileExplorerView
      className={className}
      isLoading={isLoading}
      files={files}
      processedFilesCount={processedFilesCount}
      selectedPaths={selectedPaths}
      onQuickLook={onQuickLook}
      handlers={{
        handleSelect: handlers.handleSelect,
        handleOpen: handlers.handleOpen,
        handleDrop: handlers.handleDrop,
        handleCreateFolder: handlers.handleCreateFolder,
        handleCreateFile: handlers.handleCreateFile,
        handleRename: handlers.handleRename,
        handleCopy: handlers.handleCopy,
        handleCut: handlers.handleCut,
        handlePaste: handlers.handlePaste,
        handleDelete: handlers.handleDelete,
        handleStartNewFolder: handlers.handleStartNewFolder,
        handleStartNewFile: handlers.handleStartNewFile,
        handleStartRenameAt: handlers.handleStartRenameAt,
      }}
      viewMode={viewSettings.mode}
      showColumnHeadersInSimpleList={layoutSettings.showColumnHeadersInSimpleList}
      columnWidths={columnWidths}
      setColumnWidth={setColumnWidth}
      performanceThreshold={performanceSettings.virtualListThreshold}
      // pass settings and sorting down to view
      displaySettings={displaySettings}
      appearance={appearance}
      performanceSettings={{
        lazyLoadImages: performanceSettings.lazyLoadImages,
        thumbnailCacheSize: performanceSettings.thumbnailCacheSize,
      }}
      sortConfig={sortConfig}
      onSort={setSortField}
    />
  )

  return (
    <FileContextMenu
      selectedPaths={getSelectedPaths()}
      onCopy={handlers.handleCopy}
      onCut={handlers.handleCut}
      onPaste={handlers.handlePaste}
      onDelete={handleDelete}
      onRename={handlers.handleStartRename}
      onNewFolder={handlers.handleStartNewFolder}
      onNewFile={handlers.handleStartNewFile}
      onRefresh={() => refetch()}
      canPaste={clipboardHasContent()}
    >
      <div
        className={cn("flex flex-col h-full", className)}
        data-testid="file-explorer-container"
        onPointerDown={(e) => {
          const ev = e as React.PointerEvent
          // Only clear selection on primary (left) button and when clicking the background itself
          if (ev.button !== 0) return
          if (ev.target !== ev.currentTarget) return
          clearSelection()
        }}
      >
        {/* Quick Filter Bar */}
        {isQuickFilterActive && (
          <QuickFilterBar totalCount={processedFilesCount} filteredCount={files.length} />
        )}

        {/* Content */}
        {content}

        {/* Copy Progress Dialog */}
        <CopyProgressDialog
          open={copyDialogOpen}
          onCancel={() => setCopyDialogOpen(false)}
          onComplete={() => {
            setCopyDialogOpen(false)
            refetch()
          }}
        />
      </div>
    </FileContextMenu>
  )
}
