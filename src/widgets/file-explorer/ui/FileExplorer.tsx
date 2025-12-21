import { useCallback, useEffect, useMemo, useState } from "react"
import {
  filterEntries,
  sortEntries,
  useCopyEntries,
  useCreateDirectory,
  useCreateFile,
  useDeleteEntries,
  useDirectoryContents,
  useFileWatcher,
  useMoveEntries,
  useRenameEntry,
  useStreamingDirectory,
} from "@/entities/file-entry"
import { useClipboardStore } from "@/features/clipboard"
import { FileContextMenu } from "@/features/context-menu"
import { useDeleteConfirmStore } from "@/features/delete-confirm"
import { useSelectionStore } from "@/features/file-selection"
import { useLayoutStore } from "@/features/layout"
import { useNavigationStore } from "@/features/navigation"
import { QuickFilterBar, useQuickFilterStore } from "@/features/quick-filter"
import {
  useAppearanceSettings,
  useBehaviorSettings,
  useFileDisplaySettings,
  useLayoutSettings,
  usePerformanceSettings,
} from "@/features/settings"
import { useSortingStore } from "@/features/sorting"
import { useViewModeStore } from "@/features/view-mode"
import type { FileEntry } from "@/shared/api/tauri"
import { cn } from "@/shared/lib"
import { getLastNav, setLastFiles, setPerfLog } from "@/shared/lib/devLogger"
import { withPerfSync } from "@/shared/lib/perf"
import { toast } from "@/shared/ui"
import { CopyProgressDialog } from "@/widgets/progress-dialog"
import { useFileExplorerHandlers, useFileExplorerKeyboard } from "../lib"
import { FileExplorerView } from "./FileExplorer.view"

interface FileExplorerProps {
  className?: string
  onQuickLook?: (file: FileEntry) => void
  onFilesChange?: (files: FileEntry[]) => void
}

export function FileExplorer({ className, onQuickLook, onFilesChange }: FileExplorerProps) {
  const { currentPath } = useNavigationStore()
  const { settings: viewSettings } = useViewModeStore()
  const { sortConfig, setSortField } = useSortingStore()

  const displaySettings = useFileDisplaySettings()
  const appearance = useAppearanceSettings()
  const behaviorSettings = useBehaviorSettings()
  const layoutSettings = useLayoutSettings()

  const { filter: quickFilter, isActive: isQuickFilterActive } = useQuickFilterStore()

  const [copyDialogOpen, setCopyDialogOpen] = useState(false)
  const [_copySource, _setCopySource] = useState<string[]>([])
  const [_copyDestination, _setCopyDestination] = useState<string>("")

  const selectedPaths = useSelectionStore((s) => s.selectedPaths)
  const clearSelection = useSelectionStore((s) => s.clearSelection)
  const getSelectedPaths = useSelectionStore((s) => s.getSelectedPaths)

  // Layout selectors to avoid getState() in render
  const columnWidths = useLayoutStore((s) => s.layout.columnWidths)
  const setColumnWidth = useLayoutStore((s) => s.setColumnWidth)

  const clipboardHasContent = useClipboardStore((s) => s.hasContent)

  // Data fetching - prefer streaming directory for faster incremental rendering
  const dirQuery = useDirectoryContents(currentPath)
  const stream = useStreamingDirectory(currentPath)

  const rawFiles = stream.entries.length > 0 ? stream.entries : dirQuery.data
  const isLoading = dirQuery.isLoading || stream.isLoading
  const refetch = dirQuery.refetch

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

  // Mutations
  const { mutateAsync: createDirectory } = useCreateDirectory()
  const { mutateAsync: createFile } = useCreateFile()
  const { mutateAsync: renameEntry } = useRenameEntry()
  const { mutateAsync: deleteEntries } = useDeleteEntries()
  const { mutateAsync: copyEntries } = useCopyEntries()
  const { mutateAsync: moveEntries } = useMoveEntries()

  const processedFiles = useMemo(() => {
    // Compute processed files (filter + sort) without side-effects
    if (!rawFiles) return []

    // Filter with settings - use showHiddenFiles from displaySettings
    const filtered = filterEntries(rawFiles, {
      showHidden: displaySettings.showHiddenFiles,
    })

    // Sort
    const sorted = sortEntries(filtered, sortConfig)

    return sorted
  }, [rawFiles, displaySettings.showHiddenFiles, sortConfig])

  // Log process metadata in an effect (avoid mutations during render)
  useEffect(() => {
    try {
      setPerfLog({
        lastProcess: { path: currentPath, count: processedFiles.length, ts: Date.now() },
      })
    } catch {
      /* ignore */
    }
  }, [processedFiles.length, currentPath])

  const files = useMemo(() => {
    if (!isQuickFilterActive || !quickFilter) return processedFiles

    return filterEntries(processedFiles, {
      showHidden: displaySettings.showHiddenFiles,
      searchQuery: quickFilter,
    })
  }, [processedFiles, isQuickFilterActive, quickFilter, displaySettings.showHiddenFiles])

  useEffect(() => {
    onFilesChange?.(files)

    // Expose files to keyboard helpers (used by vim-mode fallback)
    try {
      setLastFiles(files)
    } catch {
      /* ignore */
    }

    try {
      const last = getLastNav()
      if (last) {
        withPerfSync(
          "nav->render",
          { id: last.id, path: last.path, filesCount: files.length },
          () => {
            const now = performance.now()
            const navToRender = now - last.t
            setPerfLog({
              lastRender: {
                id: last.id,
                path: last.path,
                navToRender,
                filesCount: files.length,
                ts: Date.now(),
              },
            })
          },
        )
      } else {
        withPerfSync("nav->render", { filesCount: files.length }, () => {
          setPerfLog({ lastRender: { filesCount: files.length, ts: Date.now() } })
        })
      }
    } catch {
      /* ignore */
    }
  }, [files, onFilesChange])

  const handlers = useFileExplorerHandlers({
    files,
    createDirectory: async (path) => {
      await createDirectory(path)
    },
    createFile: async (path) => {
      await createFile(path)
    },
    renameEntry: async ({ oldPath, newName }) => {
      await renameEntry({ oldPath, newName })
    },
    deleteEntries: async ({ paths, permanent }) => {
      await deleteEntries({ paths, permanent })
    },
    copyEntries: async ({ sources, destination }) => {
      await copyEntries({ sources, destination })
    },
    moveEntries: async ({ sources, destination }) => {
      await moveEntries({ sources, destination })
    },
    onQuickLook: onQuickLook,
    onStartCopyWithProgress: (sources, destination) => {
      _setCopySource(sources)
      _setCopyDestination(destination)
      setCopyDialogOpen(true)
    },
  })

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
      await deleteEntries({ paths, permanent: false })
      toast.success(`Удалено: ${paths.length} элемент(ов)`)
      clearSelection()
    } catch (error) {
      toast.error(`Ошибка удаления: ${error}`)
    }
  }, [
    getSelectedPaths,
    behaviorSettings.confirmDelete,
    deleteEntries,
    clearSelection,
    openDeleteConfirm,
  ])

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
      processedFilesCount={processedFiles.length}
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
          <QuickFilterBar totalCount={processedFiles.length} filteredCount={files.length} />
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
