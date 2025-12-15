import { openPath } from "@tauri-apps/plugin-opener"
import { useCallback } from "react"
import { useClipboardStore } from "@/features/clipboard"
import { useSelectionStore } from "@/features/file-selection"
import { useInlineEditStore } from "@/features/inline-edit"
import { useNavigationStore } from "@/features/navigation"
import type { FileEntry } from "@/shared/api/tauri"
import { joinPath } from "@/shared/lib"
import { toast } from "@/shared/ui"

interface UseFileExplorerHandlersOptions {
  files: FileEntry[]
  createDirectory: (path: string) => Promise<void>
  createFile: (path: string) => Promise<void>
  renameEntry: (params: { oldPath: string; newName: string }) => Promise<void>
  deleteEntries: (params: { paths: string[]; permanent: boolean }) => Promise<void>
  copyEntries: (params: { sources: string[]; destination: string }) => Promise<void>
  moveEntries: (params: { sources: string[]; destination: string }) => Promise<void>
  onStartCopyWithProgress: (sources: string[], destination: string) => void
}

export function useFileExplorerHandlers({
  files,
  createDirectory,
  createFile,
  renameEntry,
  deleteEntries,
  copyEntries,
  moveEntries,
  onStartCopyWithProgress,
}: UseFileExplorerHandlersOptions) {
  const { currentPath, navigate } = useNavigationStore()
  const { selectFile, toggleSelection, selectRange, clearSelection, getSelectedPaths } =
    useSelectionStore()
  const { reset: resetInlineEdit } = useInlineEditStore()
  const {
    paths: clipboardPaths,
    action: clipboardAction,
    clear: clearClipboard,
  } = useClipboardStore()
  const clipboardCopy = useClipboardStore((s) => s.copy)
  const clipboardCut = useClipboardStore((s) => s.cut)

  // Selection handlers
  const handleSelect = useCallback(
    (path: string, e: React.MouseEvent) => {
      if (e.shiftKey && files.length > 0) {
        const allPaths = files.map((f) => f.path)
        const lastSelected = getSelectedPaths()[0] || allPaths[0]
        selectRange(lastSelected, path, allPaths)
      } else if (e.ctrlKey || e.metaKey) {
        toggleSelection(path)
      } else {
        selectFile(path)
      }
    },
    [files, selectFile, toggleSelection, selectRange, getSelectedPaths],
  )

  const handleOpen = useCallback(
    async (path: string, isDir: boolean) => {
      if (isDir) {
        navigate(path)
        clearSelection()
      } else {
        try {
          await openPath(path)
        } catch (error) {
          toast.error(`Не удалось открыть файл: ${error}`)
        }
      }
    },
    [navigate, clearSelection],
  )

  // Drag & drop handler
  const handleDrop = useCallback(
    async (sources: string[], destination: string) => {
      try {
        await moveEntries({ sources, destination })
        toast.success(`Перемещено ${sources.length} элементов`)
        clearSelection()
      } catch (error) {
        toast.error(`Ошибка перемещения: ${error}`)
      }
    },
    [moveEntries, clearSelection],
  )

  // Inline create/rename handlers
  const handleCreateFolder = useCallback(
    async (name: string) => {
      if (!currentPath) return
      try {
        await createDirectory(joinPath(currentPath, name))
        toast.success(`Папка "${name}" создана`)
      } catch (error) {
        toast.error(`Ошибка создания папки: ${error}`)
      }
      resetInlineEdit()
    },
    [currentPath, createDirectory, resetInlineEdit],
  )

  const handleCreateFile = useCallback(
    async (name: string) => {
      if (!currentPath) return
      try {
        await createFile(joinPath(currentPath, name))
        toast.success(`Файл "${name}" создан`)
      } catch (error) {
        toast.error(`Ошибка создания файла: ${error}`)
      }
      resetInlineEdit()
    },
    [currentPath, createFile, resetInlineEdit],
  )

  const handleRename = useCallback(
    async (oldPath: string, newName: string) => {
      try {
        await renameEntry({ oldPath, newName })
        toast.success(`Переименовано в "${newName}"`)
      } catch (error) {
        toast.error(`Ошибка переименования: ${error}`)
      }
      resetInlineEdit()
    },
    [renameEntry, resetInlineEdit],
  )

  // Clipboard operations
  const handleCopy = useCallback(() => {
    const selected = getSelectedPaths()
    if (selected.length > 0) {
      clipboardCopy(selected)
      toast.info(`Скопировано ${selected.length} элементов`)
    }
  }, [getSelectedPaths, clipboardCopy])

  const handleCut = useCallback(() => {
    const selected = getSelectedPaths()
    if (selected.length > 0) {
      clipboardCut(selected)
      toast.info(`Вырезано ${selected.length} элементов`)
    }
  }, [getSelectedPaths, clipboardCut])

  const handlePaste = useCallback(async () => {
    if (!currentPath || clipboardPaths.length === 0) return

    try {
      if (clipboardPaths.length > 5) {
        onStartCopyWithProgress(clipboardPaths, currentPath)
      } else if (clipboardAction === "cut") {
        await moveEntries({ sources: clipboardPaths, destination: currentPath })
        clearClipboard()
        toast.success(`Перемещено ${clipboardPaths.length} элементов`)
      } else {
        await copyEntries({ sources: clipboardPaths, destination: currentPath })
        toast.success(`Скопировано ${clipboardPaths.length} элементов`)
      }
    } catch (error) {
      toast.error(`Ошибка вставки: ${error}`)
    }
  }, [
    currentPath,
    clipboardPaths,
    clipboardAction,
    copyEntries,
    moveEntries,
    clearClipboard,
    onStartCopyWithProgress,
  ])

  const handleDelete = useCallback(async () => {
    const selected = getSelectedPaths()
    if (selected.length === 0) return

    try {
      await deleteEntries({ paths: selected, permanent: false })
      toast.success(`Удалено ${selected.length} элементов`)
      clearSelection()
    } catch (error) {
      toast.error(`Ошибка удаления: ${error}`)
    }
  }, [getSelectedPaths, deleteEntries, clearSelection])

  return {
    handleSelect,
    handleOpen,
    handleDrop,
    handleCreateFolder,
    handleCreateFile,
    handleRename,
    handleCopy,
    handleCut,
    handlePaste,
    handleDelete,
    getSelectedPaths,
  }
}
