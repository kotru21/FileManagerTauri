import { useCallback, useMemo, useState } from "react"
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
import { useSortingStore } from "@/features/sorting"
import { useViewModeStore } from "@/features/view-mode"
import { cn } from "@/shared/lib"
import { CopyProgressDialog } from "@/widgets/progress-dialog"
import { useFileExplorerHandlers, useFileExplorerKeyboard } from "../lib"
import { FileGrid } from "./FileGrid"
import { VirtualFileList } from "./VirtualFileList"

interface FileExplorerProps {
  className?: string
}

export function FileExplorer({ className }: FileExplorerProps) {
  const { currentPath } = useNavigationStore()
  const { selectedPaths, getSelectedPaths, clearSelection } = useSelectionStore()
  const { hasContent: hasClipboard } = useClipboardStore()
  const { settings } = useViewModeStore()
  const { sortConfig } = useSortingStore()
  const { startNewFolder, startNewFile, startRename } = useInlineEditStore()

  // Progress dialog state
  const [copyProgress, setCopyProgress] = useState<{
    open: boolean
    sources: string[]
    destination: string
  }>({ open: false, sources: [], destination: "" })

  // Data fetching
  const { data: rawFiles, isLoading, refetch } = useDirectoryContents(currentPath)

  // File watcher
  useFileWatcher(currentPath)

  // Mutations (use mutateAsync wrappers)
  const { mutateAsync: createDirectoryMutate } = useCreateDirectory()
  const { mutateAsync: createFileMutate } = useCreateFile()
  const { mutateAsync: renameEntryMutate } = useRenameEntry()
  const { mutateAsync: deleteEntriesMutate } = useDeleteEntries()
  const { mutateAsync: copyEntriesMutate } = useCopyEntries()
  const { mutateAsync: moveEntriesMutate } = useMoveEntries()

  const createDirectory = useCallback(
    async (path: string) => {
      await createDirectoryMutate(path)
    },
    [createDirectoryMutate],
  )

  const createFile = useCallback(
    async (path: string) => {
      await createFileMutate(path)
    },
    [createFileMutate],
  )

  const renameEntry = useCallback(
    async (params: { oldPath: string; newName: string }) => {
      await renameEntryMutate(params)
    },
    [renameEntryMutate],
  )

  const deleteEntries = useCallback(
    async (params: { paths: string[]; permanent: boolean }) => {
      await deleteEntriesMutate(params)
    },
    [deleteEntriesMutate],
  )

  const copyEntries = useCallback(
    async (params: { sources: string[]; destination: string }) => {
      await copyEntriesMutate(params)
    },
    [copyEntriesMutate],
  )

  const moveEntries = useCallback(
    async (params: { sources: string[]; destination: string }) => {
      await moveEntriesMutate(params)
    },
    [moveEntriesMutate],
  )

  // Process files with sorting and filtering
  const files = useMemo(() => {
    if (!rawFiles) return []

    const filtered = filterEntries(rawFiles, {
      showHidden: settings.showHidden,
    })

    return sortEntries(filtered, sortConfig)
  }, [rawFiles, settings.showHidden, sortConfig])

  // Handlers
  const {
    handleSelect,
    handleOpen,
    handleDrop,
    handleCreateFolder,
    handleCreateFile,
    handleRename,
    handleDelete,
    handleCopy,
    handleCut,
    handlePaste,
  } = useFileExplorerHandlers({
    files,
    createDirectory,
    createFile,
    renameEntry,
    deleteEntries,
    copyEntries,
    moveEntries,
    onStartCopyWithProgress: (sources, destination) => {
      setCopyProgress({ open: true, sources, destination })
    },
  })

  // Keyboard shortcuts
  const handleStartNewFolder = useCallback(() => {
    if (currentPath) startNewFolder(currentPath)
  }, [currentPath, startNewFolder])

  const handleStartNewFile = useCallback(() => {
    if (currentPath) startNewFile(currentPath)
  }, [currentPath, startNewFile])

  const handleStartRename = useCallback(() => {
    const selected = getSelectedPaths()
    if (selected.length === 1) {
      startRename(selected[0])
    }
  }, [getSelectedPaths, startRename])

  const handleRefresh = useCallback(() => {
    refetch()
  }, [refetch])

  useFileExplorerKeyboard({
    onCopy: handleCopy,
    onCut: handleCut,
    onPaste: handlePaste,
    onDelete: handleDelete,
    onStartNewFolder: handleStartNewFolder,
    onRefresh: handleRefresh,
    getSelectedPaths,
  })

  const renderContent = () => {
    if (settings.mode === "grid") {
      return (
        <FileGrid
          files={files}
          selectedPaths={selectedPaths}
          onSelect={(path, e) => handleSelect(path, e)}
          onOpen={(path, isDir) => handleOpen(path, isDir)}
          onDrop={handleDrop}
        />
      )
    }

    return (
      <VirtualFileList
        files={files}
        selectedPaths={selectedPaths}
        onSelect={(path, e) => handleSelect(path, e)}
        onOpen={(path, isDir) => handleOpen(path, isDir)}
        onDrop={handleDrop}
        getSelectedPaths={getSelectedPaths}
        onCreateFolder={handleCreateFolder}
        onCreateFile={handleCreateFile}
        onRename={handleRename}
      />
    )
  }

  return (
    <FileContextMenu
      selectedPaths={getSelectedPaths()}
      onCopy={handleCopy}
      onCut={handleCut}
      onPaste={handlePaste}
      onDelete={handleDelete}
      onRename={handleStartRename}
      onNewFolder={handleStartNewFolder}
      onNewFile={handleStartNewFile}
      onRefresh={handleRefresh}
      canPaste={hasClipboard()}
    >
      <div
        className={cn("flex-1 overflow-hidden", isLoading && "opacity-50", className)}
        onClick={(e) => {
          // Clear selection when clicking empty area
          if (e.target === e.currentTarget) {
            clearSelection()
          }
        }}
      >
        {renderContent()}

        <CopyProgressDialog
          open={copyProgress.open}
          onCancel={() => setCopyProgress({ open: false, sources: [], destination: "" })}
          onComplete={() => {
            setCopyProgress({ open: false, sources: [], destination: "" })
            handleRefresh()
          }}
        />
      </div>
    </FileContextMenu>
  )
}
