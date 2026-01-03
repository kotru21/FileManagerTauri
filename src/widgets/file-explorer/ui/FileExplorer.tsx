import { getCurrentWindow } from "@tauri-apps/api/window"
import { useCallback, useEffect, useMemo } from "react"
import { filterEntries, useFileWatcher } from "@/entities/file-entry"
import { useLayoutStore } from "@/entities/layout"
import { useClipboardStore } from "@/features/clipboard"
import { useConfirmStore } from "@/features/confirm"
import { FileContextMenu } from "@/features/context-menu"
import { useDeleteConfirmStore } from "@/features/delete-confirm"
import { useSelectionStore } from "@/features/file-selection"
import { useNavigationStore } from "@/features/navigation"
import { QuickFilterBar, useQuickFilterStore } from "@/features/quick-filter"
import { useBehaviorSettings, useLayoutSettings, usePerformanceSettings } from "@/features/settings"
import { useViewModeStore } from "@/features/view-mode"
import type { FileEntry } from "@/shared/api/tauri"
import { tauriClient } from "@/shared/api/tauri/client"
import { cn } from "@/shared/lib"
import { toast } from "@/shared/ui"
import { CopyProgressDialog } from "@/widgets/progress-dialog"
import { useFileExplorerKeyboard, useFileExplorerLogic } from "../lib"
import { FileExplorerView } from "./FileExplorer.view"

interface FileExplorerProps {
  className?: string
  onFilesChange?: (files: FileEntry[]) => void
}

export function FileExplorer({ className, onFilesChange }: FileExplorerProps) {
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
  } = useFileExplorerLogic(currentPath, onFilesChange)

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

  const openConfirm = useConfirmStore((s) => s.open)

  const openDeleteConfirm = useDeleteConfirmStore((s) => s.open)

  // Delete handler with confirmation based on settings
  const handleDelete = useCallback(async () => {
    const paths = getSelectedPaths()
    if (paths.length === 0) return

    // Use confirmDelete from behaviorSettings
    if (behaviorSettings.confirmDelete) {
      const confirmed = await openDeleteConfirm(paths)
      if (!confirmed) return
    }

    try {
      await handlers.handleDelete()
    } catch (error) {
      toast.error(`Ошибка удаления: ${error}`)
    }
  }, [getSelectedPaths, behaviorSettings.confirmDelete, openDeleteConfirm, handlers])

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

  useEffect(() => {
    const win = getCurrentWindow()

    const unlisten = win.onDragDropEvent(async (event) => {
      const payload = (event as unknown as { payload?: unknown }).payload as
        | {
            type?: string
            paths?: unknown
            position?: { x?: unknown; y?: unknown }
          }
        | undefined

      if (!payload || payload.type !== "drop") return
      const paths = Array.isArray(payload.paths)
        ? payload.paths.filter((p): p is string => typeof p === "string" && p.length > 0)
        : []

      if (paths.length === 0) return
      if (!currentPath) {
        toast.info("Сначала выберите папку назначения")
        return
      }

      let destination = currentPath
      const x = payload.position?.x
      const y = payload.position?.y
      if (typeof x === "number" && typeof y === "number") {
        const el = document.elementFromPoint(x, y)
        const targetPath = el?.closest?.("[data-path]")?.getAttribute?.("data-path")
        if (targetPath) {
          const f = files.find((it) => it.path === targetPath)
          if (f?.is_dir) destination = f.path
        }
      }

      const destinationNames = files.map((f) => f.name)
      const conflictNames = paths
        .map((p) => p.split(/[\\/]/).pop() || p)
        .filter((name) => destinationNames.includes(name))

      if (conflictNames.length > 0 && behaviorSettings.confirmOverwrite) {
        const message = `В целевой папке уже существуют файлы: ${conflictNames.join(", ")}. Перезаписать?`
        const ok = await openConfirm("Перезаписать файлы?", message)
        if (!ok) return
      }

      const useProgress = paths.length > 5
      if (useProgress) setCopyDialogOpen(true)

      try {
        if (useProgress) {
          await tauriClient.copyEntriesParallel(paths, destination)
        } else {
          await tauriClient.copyEntries(paths, destination)
        }
        toast.success(`Скопировано ${paths.length} элементов`)
        refetch()
      } catch (error) {
        toast.error(`Ошибка копирования: ${error}`)
        if (useProgress) setCopyDialogOpen(false)
      }
    })

    return () => {
      unlisten.then((fn) => fn())
    }
  }, [
    behaviorSettings.confirmOverwrite,
    currentPath,
    files,
    openConfirm,
    refetch,
    setCopyDialogOpen,
  ])

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
