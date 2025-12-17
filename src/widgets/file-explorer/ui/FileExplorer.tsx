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
} from "@/entities/file-entry"
import { useClipboardStore } from "@/features/clipboard"
import { FileContextMenu } from "@/features/context-menu"
import { useDeleteConfirmStore } from "@/features/delete-confirm"
import { useSelectionStore } from "@/features/file-selection"
import { useInlineEditStore } from "@/features/inline-edit"
import { useNavigationStore } from "@/features/navigation"
import {
  createOperationDescription,
  useOperationsHistoryStore,
} from "@/features/operations-history"
import { QuickFilterBar, useQuickFilterStore } from "@/features/quick-filter"
import {
  useBehaviorSettings,
  useFileDisplaySettings,
  usePerformanceSettings,
} from "@/features/settings"
import { useSortingStore } from "@/features/sorting"
import { useViewModeStore } from "@/features/view-mode"
import type { FileEntry } from "@/shared/api/tauri"
import { cn } from "@/shared/lib"
import { toast } from "@/shared/ui"
import { CopyProgressDialog } from "@/widgets/progress-dialog"
import { useFileExplorerHandlers, useFileExplorerKeyboard } from "../lib"
import { FileGrid } from "./FileGrid"
import { VirtualFileList } from "./VirtualFileList"

interface FileExplorerProps {
  className?: string
  onQuickLook?: (file: FileEntry) => void
  onFilesChange?: (files: FileEntry[]) => void
}

export function FileExplorer({ className, onQuickLook, onFilesChange }: FileExplorerProps) {
  const { currentPath } = useNavigationStore()
  const { settings: viewSettings } = useViewModeStore()
  const { sortConfig } = useSortingStore()

  // Get all settings
  const displaySettings = useFileDisplaySettings()
  const behaviorSettings = useBehaviorSettings()

  // Quick filter
  const { filter: quickFilter, isActive: isQuickFilterActive } = useQuickFilterStore()

  // Progress dialog state
  const [copyDialogOpen, setCopyDialogOpen] = useState(false)
  const [copySource, setCopySource] = useState<string[]>([])
  const [copyDestination, setCopyDestination] = useState<string>("")

  // Selection
  const selectedPaths = useSelectionStore((s) => s.selectedPaths)
  const clearSelection = useSelectionStore((s) => s.clearSelection)
  const getSelectedPaths = useSelectionStore((s) => s.getSelectedPaths)

  // Data fetching
  const { data: rawFiles, isLoading, refetch } = useDirectoryContents(currentPath)

  // File watcher
  useFileWatcher(currentPath)

  // Auto-refresh on window focus
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

  // Process files with sorting and filtering
  const processedFiles = useMemo(() => {
    if (!rawFiles) return []

    // Filter with settings - use showHiddenFiles from displaySettings
    const filtered = filterEntries(rawFiles, {
      showHidden: displaySettings.showHiddenFiles,
    })

    // Sort
    return sortEntries(filtered, sortConfig)
  }, [rawFiles, displaySettings.showHiddenFiles, sortConfig])

  // Apply quick filter
  const files = useMemo(() => {
    if (!isQuickFilterActive || !quickFilter) return processedFiles

    return filterEntries(processedFiles, {
      showHidden: displaySettings.showHiddenFiles,
      searchQuery: quickFilter,
    })
  }, [processedFiles, isQuickFilterActive, quickFilter, displaySettings.showHiddenFiles])

  // Notify parent about files change
  useEffect(() => {
    onFilesChange?.(files)
  }, [files, onFilesChange])

  // Handlers
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
    onStartCopyWithProgress: (sources, destination) => {
      setCopySource(sources)
      setCopyDestination(destination)
      setCopyDialogOpen(true)
    },
  })

  // Delete handler with confirmation based on settings
  const handleDelete = useCallback(async () => {
    const paths = getSelectedPaths()
    if (paths.length === 0) return

    // Use confirmDelete from behaviorSettings
    if (behaviorSettings.confirmDelete) {
      const confirmed = await useDeleteConfirmStore.getState().open(paths, false)
      if (!confirmed) return
    }

    try {
      await deleteEntries({ paths, permanent: false })
      toast.success(`Удалено: ${paths.length} элемент(ов)`)
      clearSelection()
    } catch (error) {
      toast.error(`Ошибка удаления: ${error}`)
    }
  }, [getSelectedPaths, behaviorSettings.confirmDelete, deleteEntries, clearSelection])

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
    onCopy: handlers.handleCopy,
    onCut: handlers.handleCut,
    onPaste: handlers.handlePaste,
    onDelete: handleDelete,
    onStartNewFolder: handlers.handleStartNewFolder,
    onRefresh: () => refetch(),
    onQuickLook: handleQuickLook,
  })

  const renderContent = () => {
    if (isLoading) {
      return <div className="flex-1 flex items-center justify-center">Загрузка...</div>
    }

    if (viewSettings.mode === "grid") {
      return (
        <FileGrid
          files={files}
          selectedPaths={selectedPaths}
          onSelect={handlers.handleSelect}
          onOpen={handlers.handleOpen}
          onDrop={handlers.handleDrop}
          onQuickLook={onQuickLook}
        />
      )
    }

    return (
      <VirtualFileList
        files={files}
        selectedPaths={selectedPaths}
        onSelect={handlers.handleSelect}
        onOpen={handlers.handleOpen}
        onDrop={handlers.handleDrop}
        getSelectedPaths={getSelectedPaths}
        onCreateFolder={handlers.handleCreateFolder}
        onCreateFile={handlers.handleCreateFile}
        onRename={handlers.handleRename}
        onCopy={handlers.handleCopy}
        onCut={handlers.handleCut}
        onDelete={handleDelete}
        onQuickLook={onQuickLook}
      />
    )
  }

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
      canPaste={useClipboardStore.getState().hasContent()}
    >
      <div
        className={cn("flex flex-col h-full", className)}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            clearSelection()
          }
        }}
      >
        {/* Quick Filter Bar */}
        {isQuickFilterActive && (
          <QuickFilterBar totalCount={processedFiles.length} filteredCount={files.length} />
        )}

        {/* Content */}
        {renderContent()}

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
