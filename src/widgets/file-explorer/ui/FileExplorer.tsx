import { openPath } from "@tauri-apps/plugin-opener"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  filterEntries,
  type SortConfig,
  sortEntries,
  useCopyEntries,
  useCopyEntriesParallel,
  useDeleteEntries,
  useDirectoryContents,
  useMoveEntries,
} from "@/entities/file-entry"
import { useClipboardStore } from "@/features/clipboard"
import { FileContextMenu } from "@/features/context-menu"
import { DeleteConfirmDialog } from "@/features/file-dialogs"
import { useSelectionStore } from "@/features/file-selection"
import { useHomeStore } from "@/features/home"
import { useLayoutStore } from "@/features/layout"
import { useNavigationStore } from "@/features/navigation"
import { VIEW_MODES } from "@/shared/config"
import { cn, getBasename } from "@/shared/lib"
import { toast } from "@/shared/ui"
import { CopyProgressDialog } from "@/widgets/progress-dialog"
import { GridFileList } from "./GridFileList"
import { VirtualFileList } from "./VirtualFileList"

interface FileExplorerProps {
  showHidden?: boolean
  sortConfig?: SortConfig
  onRenameRequest?: (path: string) => void
  onNewFolderRequest?: () => void
  onNewFileRequest?: () => void
  className?: string
}

export function FileExplorer({
  showHidden = false,
  sortConfig = { field: "name", direction: "asc" },
  onRenameRequest,
  onNewFolderRequest,
  onNewFileRequest,
  className,
}: FileExplorerProps) {
  const currentPath = useNavigationStore((s) => s.currentPath)
  const navigate = useNavigationStore((s) => s.navigate)

  const { data: rawFiles = [], refetch } = useDirectoryContents(currentPath)

  const {
    selectedPaths,
    selectFile,
    selectRange,
    toggleSelection,
    clearSelection,
    getSelectedPaths,
  } = useSelectionStore()

  const {
    copy,
    cut,
    paths: clipboardPaths,
    isCut,
    clear: clearClipboard,
    hasContent,
  } = useClipboardStore()

  const copyMutation = useCopyEntries()
  const copyParallelMutation = useCopyEntriesParallel()
  const moveMutation = useMoveEntries()
  const deleteMutation = useDeleteEntries()

  // Состояние для диалога прогресса
  const [showCopyProgress, setShowCopyProgress] = useState(false)

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    paths: string[]
    permanent: boolean
  }>({ open: false, paths: [], permanent: false })

  const files = useMemo(() => {
    const filtered = filterEntries(rawFiles, { showHidden })
    return sortEntries(filtered, sortConfig)
  }, [rawFiles, showHidden, sortConfig])

  const allPaths = useMemo(() => files.map((f) => f.path), [files])

  const handleSelect = useCallback(
    (path: string, e: React.MouseEvent) => {
      const lastSelected = useSelectionStore.getState().lastSelectedPath

      if (e.shiftKey && lastSelected) {
        selectRange(lastSelected, path, allPaths)
      } else if (e.ctrlKey || e.metaKey) {
        toggleSelection(path)
      } else {
        selectFile(path)
      }
    },
    [selectFile, selectRange, toggleSelection, allPaths],
  )

  const handleOpen = useCallback(
    async (path: string, isDir: boolean) => {
      useHomeStore.getState().trackOpen(path, isDir, getBasename(path))
      if (isDir) {
        clearSelection()
        navigate(path)
      } else {
        try {
          await openPath(path)
        } catch (error) {
          console.error("Failed to open file:", error)
        }
      }
    },
    [navigate, clearSelection],
  )

  const handleCopy = useCallback(() => {
    copy(getSelectedPaths())
  }, [copy, getSelectedPaths])

  const handleCut = useCallback(() => {
    cut(getSelectedPaths())
  }, [cut, getSelectedPaths])

  const handlePaste = useCallback(async () => {
    if (!currentPath || clipboardPaths.length === 0) return

    try {
      if (isCut()) {
        await moveMutation.mutateAsync({
          sources: clipboardPaths,
          destination: currentPath,
        })
        clearClipboard()
      } else {
        // Используем параллельное копирование с прогрессом для множества файлов
        if (clipboardPaths.length > 1) {
          setShowCopyProgress(true)
          await copyParallelMutation.mutateAsync({
            sources: clipboardPaths,
            destination: currentPath,
          })
        } else {
          await copyMutation.mutateAsync({
            sources: clipboardPaths,
            destination: currentPath,
          })
        }
      }
    } catch (error) {
      console.error("Paste failed:", error)
    }
  }, [
    currentPath,
    clipboardPaths,
    isCut,
    moveMutation,
    copyMutation,
    copyParallelMutation,
    clearClipboard,
  ])

  const requestDelete = useCallback(
    (initialPermanent: boolean) => {
      const paths = getSelectedPaths()
      if (paths.length === 0) return
      setDeleteDialog({ open: true, paths, permanent: initialPermanent })
    },
    [getSelectedPaths],
  )

  const handleDeleteConfirm = useCallback(
    async ({ paths, permanent }: { paths: string[]; permanent: boolean }) => {
      try {
        await deleteMutation.mutateAsync({ paths, permanent })
        setDeleteDialog({ open: false, paths: [], permanent: false })
        clearSelection()
        toast.success(permanent ? "Удаление выполнено" : "Перемещено в корзину", 2000)
      } catch (error) {
        console.error("Delete failed:", error)
        const message = error instanceof Error ? error.message : String(error)
        toast.error(`Не удалось удалить: ${message}`, 4000)
      }
    },
    [deleteMutation, clearSelection],
  )

  const handleRename = useCallback(() => {
    const paths = getSelectedPaths()
    if (paths.length === 1) {
      onRenameRequest?.(paths[0])
    }
  }, [getSelectedPaths, onRenameRequest])

  // Глобальные горячие клавиши для операций с файлами
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      if (e.target instanceof HTMLTextAreaElement) return

      const meta = e.ctrlKey || e.metaKey

      if (meta && (e.key === "c" || e.key === "C")) {
        e.preventDefault()
        handleCopy()
      }

      if (meta && (e.key === "x" || e.key === "X")) {
        e.preventDefault()
        handleCut()
      }

      if (meta && (e.key === "v" || e.key === "V")) {
        e.preventDefault()
        void handlePaste()
      }

      if (e.key === "Delete") {
        e.preventDefault()
        requestDelete(e.shiftKey)
      }

      if (e.key === "F2") {
        e.preventDefault()
        handleRename()
      }
    }

    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [handleCopy, handleCut, handlePaste, requestDelete, handleRename])

  const viewMode = useLayoutStore((s) => s.layout.viewMode ?? VIEW_MODES.list)

  // Home store functions
  const togglePin = useHomeStore((s) => s.togglePin)
  const removeHomeItem = useHomeStore((s) => s.removeItem)
  const isSelectedPinned = ((): boolean => {
    const sel = getSelectedPaths()
    if (sel.length !== 1) return false
    return useHomeStore.getState().items[sel[0]]?.pinned ?? false
  })()

  return (
    <>
      <FileContextMenu
        selectedPaths={getSelectedPaths()}
        selectedFiles={files.filter((f) => getSelectedPaths().includes(f.path))}
        onCopy={handleCopy}
        onCut={handleCut}
        onPaste={handlePaste}
        onDelete={() => requestDelete(false)}
        onRename={handleRename}
        onNewFolder={() => onNewFolderRequest?.()}
        onNewFile={() => onNewFileRequest?.()}
        onRefresh={() => refetch()}
        canPaste={hasContent()}
        togglePin={togglePin}
        removeItem={removeHomeItem}
        isSelectedPinned={isSelectedPinned}
      >
        {viewMode === VIEW_MODES.grid ? (
          <GridFileList
            files={files}
            selectedPaths={selectedPaths}
            onSelect={handleSelect}
            onOpen={handleOpen}
            className={cn("flex-1", className)}
            onEmptyContextMenu={() => clearSelection()}
          />
        ) : (
          <VirtualFileList
            files={files}
            selectedPaths={selectedPaths}
            onSelect={handleSelect}
            onOpen={handleOpen}
            className={cn("flex-1", className)}
            onEmptyContextMenu={() => clearSelection()}
          />
        )}
      </FileContextMenu>

      <DeleteConfirmDialog
        isOpen={deleteDialog.open}
        paths={deleteDialog.paths}
        permanent={deleteDialog.permanent}
        onPermanentChange={(permanent) => setDeleteDialog((prev) => ({ ...prev, permanent }))}
        isLoading={deleteMutation.isPending}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteDialog({ open: false, paths: [], permanent: false })
          } else {
            setDeleteDialog((prev) => ({ ...prev, open: true }))
          }
        }}
        onConfirm={handleDeleteConfirm}
      />

      {/* Диалог прогресса копирования */}
      <CopyProgressDialog
        open={showCopyProgress}
        onComplete={() => setShowCopyProgress(false)}
        onCancel={() => {
          // TODO: Реализовать отмену операции
          setShowCopyProgress(false)
        }}
      />
    </>
  )
}
