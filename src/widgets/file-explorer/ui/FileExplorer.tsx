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
import { useSelectionStore } from "@/features/file-selection"
import { useInlineEditStore } from "@/features/inline-edit"
import { useNavigationStore } from "@/features/navigation"
import { QuickFilterBar, useQuickFilterStore } from "@/features/quick-filter"
import { useSortingStore } from "@/features/sorting"
import { useViewModeStore } from "@/features/view-mode"
import type { FileEntry } from "@/shared/api/tauri"
import { cn } from "@/shared/lib"
import { CopyProgressDialog } from "@/widgets/progress-dialog"
import { useFileExplorerHandlers, useFileExplorerKeyboard } from "../lib"
import { FileGrid } from "./FileGrid"
import { VirtualFileList } from "./VirtualFileList"

interface FileExplorerProps {
  className?: string
  onQuickLook?: (file: FileEntry) => void
}

export function FileExplorer({ className, onQuickLook }: FileExplorerProps) {
  const { currentPath } = useNavigationStore()
  const { settings } = useViewModeStore()
  const { sortConfig } = useSortingStore()
  const { selectedPaths, getSelectedPaths, clearSelection } = useSelectionStore()
  const { hasContent: hasClipboard } = useClipboardStore()
  const { mode: inlineEditMode } = useInlineEditStore()

  // Quick filter
  const { filter: quickFilter } = useQuickFilterStore()

  // Progress dialog state
  const [copyDialogOpen, setCopyDialogOpen] = useState(false)

  // Data fetching
  const { data: files = [], isLoading, refetch } = useDirectoryContents(currentPath)

  // File watcher
  useFileWatcher(currentPath)

  // Mutations (use mutateAsync wrappers)
  const { mutateAsync: createDirectory } = useCreateDirectory()
  const { mutateAsync: createFile } = useCreateFile()
  const { mutateAsync: renameEntry } = useRenameEntry()
  const { mutateAsync: deleteEntries } = useDeleteEntries()
  const { mutateAsync: copyEntries } = useCopyEntries()
  const { mutateAsync: moveEntries } = useMoveEntries()

  // Process files with sorting and filtering
  const processedFiles = useMemo(() => {
    let result = filterEntries(files, {
      showHidden: settings.showHidden,
    })
    result = sortEntries(result, sortConfig)

    // Apply quick filter
    if (quickFilter) {
      const lowerFilter = quickFilter.toLowerCase()
      result = result.filter((file) => file.name.toLowerCase().includes(lowerFilter))
    }

    return result
  }, [files, settings.showHidden, sortConfig, quickFilter])

  // Handlers
  const handlers = useFileExplorerHandlers({
    files: processedFiles,
    createDirectory: (path) => createDirectory(path),
    createFile: (path) => createFile(path),
    renameEntry: (params) => renameEntry(params),
    deleteEntries: (params) => deleteEntries(params),
    copyEntries: (params) => copyEntries(params),
    moveEntries: (params) => moveEntries(params),
    onStartCopyWithProgress: () => setCopyDialogOpen(true),
  })

  // Quick Look handler (Space key)
  const handleQuickLook = useCallback(() => {
    const paths = getSelectedPaths()
    if (paths.length === 1 && onQuickLook) {
      const file = processedFiles.find((f) => f.path === paths[0])
      if (file) {
        onQuickLook(file)
      }
    }
  }, [getSelectedPaths, processedFiles, onQuickLook])

  // Keyboard shortcuts
  useFileExplorerKeyboard({
    onCopy: handlers.handleCopy,
    onCut: handlers.handleCut,
    onPaste: handlers.handlePaste,
    onDelete: handlers.handleDelete,
    onStartNewFolder: handlers.handleStartNewFolder,
    onRefresh: () => refetch(),
    onQuickLook: handleQuickLook,
  })

  // Add Space key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !inlineEditMode) {
        const target = e.target as HTMLElement
        if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA") {
          e.preventDefault()
          handleQuickLook()
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleQuickLook, inlineEditMode])

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          Загрузка...
        </div>
      )
    }

    if (!currentPath) {
      return (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          Выберите папку для просмотра
        </div>
      )
    }

    if (processedFiles.length === 0) {
      return (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          {quickFilter ? "Нет файлов, соответствующих фильтру" : "Папка пуста"}
        </div>
      )
    }

    if (settings.mode === "grid") {
      return (
        <FileGrid
          files={processedFiles}
          selectedPaths={selectedPaths}
          onSelect={(path, e) => handlers.handleSelect(path, e)}
          onOpen={(path, isDir) => handlers.handleOpen(path, isDir)}
          onDrop={handlers.handleDrop}
        />
      )
    }

    return (
      <VirtualFileList
        files={processedFiles}
        selectedPaths={selectedPaths}
        onSelect={(path, e) => handlers.handleSelect(path, e)}
        onOpen={(path, isDir) => handlers.handleOpen(path, isDir)}
        onDrop={handlers.handleDrop}
        getSelectedPaths={getSelectedPaths}
        onCreateFolder={handlers.handleCreateFolder}
        onCreateFile={handlers.handleCreateFile}
        onRename={handlers.handleRename}
      />
    )
  }

  return (
    <FileContextMenu
      selectedPaths={getSelectedPaths()}
      onCopy={handlers.handleCopy}
      onCut={handlers.handleCut}
      onPaste={handlers.handlePaste}
      onDelete={handlers.handleDelete}
      onRename={handlers.handleStartRename}
      onNewFolder={handlers.handleStartNewFolder}
      onNewFile={handlers.handleStartNewFile}
      onRefresh={() => refetch()}
      onCopyPath={handlers.handleCopyPath}
      onOpenInExplorer={handlers.handleOpenInExplorer}
      onOpenInTerminal={handlers.handleOpenInTerminal}
      canPaste={hasClipboard()}
    >
      <div
        className={cn("flex flex-col h-full", className)}
        onClick={(e) => {
          // Clear selection when clicking empty area
          if (e.target === e.currentTarget) {
            clearSelection()
          }
        }}
      >
        {/* Quick Filter Bar */}
        <QuickFilterBar totalCount={files.length} filteredCount={processedFiles.length} />

        {/* Content */}
        {renderContent()}

        {/* Copy Progress Dialog */}
        <CopyProgressDialog
          open={copyDialogOpen}
          onComplete={() => {
            setCopyDialogOpen(false)
            refetch()
          }}
          onCancel={() => setCopyDialogOpen(false)}
        />
      </div>
    </FileContextMenu>
  )
}
