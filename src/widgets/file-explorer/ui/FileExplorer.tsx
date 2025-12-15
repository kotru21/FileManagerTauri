import { useCallback, useMemo, useState } from "react"
import {
  filterEntries,
  type SortConfig,
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
import { cn } from "@/shared/lib"
import { CopyProgressDialog } from "@/widgets/progress-dialog"
import { useFileExplorerHandlers, useFileExplorerKeyboard } from "../lib"
import { VirtualFileList } from "./VirtualFileList"

interface FileExplorerProps {
  showHidden?: boolean
  sortConfig?: SortConfig
  className?: string
}

export function FileExplorer({
  showHidden = false,
  sortConfig = { field: "name", direction: "asc" },
  className,
}: FileExplorerProps) {
  const { currentPath } = useNavigationStore()
  const { selectedPaths } = useSelectionStore()
  const { startNewFolder } = useInlineEditStore()
  const { hasContent: hasClipboardContent } = useClipboardStore()

  // Progress dialog state
  const [copyProgress, setCopyProgress] = useState<{
    open: boolean
    sources: string[]
    destination: string
  }>({ open: false, sources: [], destination: "" })

  // Data fetching
  const { data: entries = [], refetch } = useDirectoryContents(currentPath)

  // File watcher
  useFileWatcher(currentPath)

  // Mutations
  const createDirectoryMutation = useCreateDirectory()
  const createFileMutation = useCreateFile()
  const renameMutation = useRenameEntry()
  const deleteMutation = useDeleteEntries()
  const copyMutation = useCopyEntries()
  const moveMutation = useMoveEntries()

  // Process files
  const processedFiles = useMemo(() => {
    const filtered = filterEntries(entries, { showHidden })
    return sortEntries(filtered, sortConfig)
  }, [entries, showHidden, sortConfig])

  // Handlers
  const handlers = useFileExplorerHandlers({
    files: processedFiles,
    createDirectory: async (path: string) => {
      await createDirectoryMutation.mutateAsync(path)
    },
    createFile: async (path: string) => {
      await createFileMutation.mutateAsync(path)
    },
    renameEntry: async (params: { oldPath: string; newName: string }) => {
      await renameMutation.mutateAsync(params)
    },
    deleteEntries: async (params: { paths: string[]; permanent: boolean }) => {
      await deleteMutation.mutateAsync(params)
    },
    copyEntries: async (params: { sources: string[]; destination: string }) => {
      await copyMutation.mutateAsync(params)
    },
    moveEntries: async (params: { sources: string[]; destination: string }) => {
      await moveMutation.mutateAsync(params)
    },
    onStartCopyWithProgress: (sources, destination) => {
      setCopyProgress({ open: true, sources, destination })
    },
  })

  // Keyboard shortcuts
  useFileExplorerKeyboard({
    onCopy: handlers.handleCopy,
    onCut: handlers.handleCut,
    onPaste: handlers.handlePaste,
    onDelete: handlers.handleDelete,
    onStartNewFolder: () => currentPath && startNewFolder(currentPath),
    onRefresh: () => refetch(),
    getSelectedPaths: handlers.getSelectedPaths,
  })

  const handleCopyComplete = useCallback(() => {
    setCopyProgress({ open: false, sources: [], destination: "" })
    refetch()
  }, [refetch])

  return (
    <>
      <FileContextMenu
        selectedPaths={handlers.getSelectedPaths()}
        onCopy={handlers.handleCopy}
        onCut={handlers.handleCut}
        onPaste={handlers.handlePaste}
        onDelete={handlers.handleDelete}
        onRename={() => {
          const selected = handlers.getSelectedPaths()
          if (selected.length === 1) {
            useInlineEditStore.getState().startRename(selected[0])
          }
        }}
        onNewFolder={() => currentPath && startNewFolder(currentPath)}
        onNewFile={() => currentPath && useInlineEditStore.getState().startNewFile(currentPath)}
        onRefresh={() => refetch()}
        canPaste={hasClipboardContent()}
      >
        <div className={cn("flex-1 overflow-hidden", className)}>
          <VirtualFileList
            files={processedFiles}
            selectedPaths={selectedPaths}
            onSelect={handlers.handleSelect}
            onOpen={handlers.handleOpen}
            onDrop={handlers.handleDrop}
            getSelectedPaths={handlers.getSelectedPaths}
            onCreateFolder={handlers.handleCreateFolder}
            onCreateFile={handlers.handleCreateFile}
            onRename={handlers.handleRename}
          />
        </div>
      </FileContextMenu>

      <CopyProgressDialog
        open={copyProgress.open}
        onCancel={() => setCopyProgress({ open: false, sources: [], destination: "" })}
        onComplete={handleCopyComplete}
      />
    </>
  )
}
