import { openPath } from "@tauri-apps/plugin-opener"
import { useCallback } from "react"
import { useClipboardStore } from "@/features/clipboard"
import { useConfirmStore } from "@/features/confirm"
import { useSelectionStore } from "@/features/file-selection"
import { useInlineEditStore } from "@/features/inline-edit"
import { useNavigationStore } from "@/features/navigation"
import { useBehaviorSettings } from "@/features/settings"
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
  const { reset: resetInlineEdit, startNewFolder, startNewFile, startRename } = useInlineEditStore()
  const {
    // Do not rely on closing over clipboard values since handlers may be called after
    // clipboard store updates without a re-render. We'll read the latest clipboard
    // values inside handlers when needed.
    clear: clearClipboard,
  } = useClipboardStore()
  const clipboardCopy = useClipboardStore((s) => s.copy)
  const clipboardCut = useClipboardStore((s) => s.cut)
  const openConfirm = useConfirmStore((s) => s.open)
  const behaviorSettings = useBehaviorSettings()

  // Selection handlers
  const handleSelect = useCallback(
    (path: string, e: React.MouseEvent) => {
      // Ctrl+Click + setting => open folder in new tab
      if ((e.ctrlKey || e.metaKey) && behaviorSettings.openFoldersInNewTab) {
        const file = files.find((f) => f.path === path)
        if (file?.is_dir) {
        }
      }

      if (!behaviorSettings.doubleClickToOpen) {
        const file = files.find((f) => f.path === path)
        if (!file) return

        // Optionally select on single click before opening
        if (behaviorSettings.singleClickToSelect) {
          selectFile(path)
        }

        // Open directories via navigation (deferred) and files via opener
        if (file.is_dir) {
          requestAnimationFrame(() => {
            navigate(path)
            // If singleClickToSelect is enabled, we keep the selection when opening via single click.
            if (!behaviorSettings.singleClickToSelect) clearSelection()
          })
        } else {
          try {
            // Use opener for files
            openPath(path)
          } catch (error) {
            toast.error(`Не удалось открыть файл: ${error}`)
          }
        }

        return
      }

      // Default selection behavior when doubleClickToOpen is enabled
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
    [
      files,
      selectFile,
      toggleSelection,
      selectRange,
      getSelectedPaths,
      behaviorSettings.openFoldersInNewTab,
      behaviorSettings.doubleClickToOpen,
      behaviorSettings.singleClickToSelect,
      navigate,
      clearSelection,
    ],
  )

  const handleOpen = useCallback(
    async (path: string, isDir: boolean) => {
      if (isDir) {
        // Defer navigation to next animation frame so click handler can finish and
        // the browser remains responsive (improves perceived latency).
        requestAnimationFrame(() => {
          navigate(path)
          clearSelection()
        })
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

  const handleStartNewFolder = useCallback(() => {
    if (!currentPath) return
    startNewFolder(currentPath)
  }, [currentPath, startNewFolder])

  const handleStartNewFile = useCallback(() => {
    if (!currentPath) return
    startNewFile(currentPath)
  }, [currentPath, startNewFile])

  const handleStartRename = useCallback(() => {
    const selected = getSelectedPaths()
    if (selected.length !== 1) return
    startRename(selected[0])
  }, [getSelectedPaths, startRename])

  const handleStartRenameAt = useCallback(
    (path: string) => {
      startRename(path)
    },
    [startRename],
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
    if (!currentPath) return

    // Read the latest clipboard state at call time so this handler works even if
    // the clipboard was updated after the hook initially ran.
    const { paths: clipboardPaths, action: clipboardAction } = useClipboardStore.getState()
    if (clipboardPaths.length === 0) return

    try {
      // Check for name conflicts in destination
      const destinationNames = files.map((f) => f.name)
      const conflictNames = clipboardPaths
        .map((p) => p.split(/[\\/]/).pop() || p)
        .filter((name) => destinationNames.includes(name))

      if (conflictNames.length > 0 && behaviorSettings.confirmOverwrite) {
        const message = `В целевой папке уже существуют файлы: ${conflictNames.join(", ")}. Перезаписать?`
        const ok = await openConfirm("Перезаписать файлы?", message)
        if (!ok) return
      }

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
    copyEntries,
    moveEntries,
    clearClipboard,
    onStartCopyWithProgress,
    files,
    behaviorSettings.confirmOverwrite,
    openConfirm,
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

  const handleCopyPath = useCallback(() => {
    const selected = getSelectedPaths()
    if (selected.length === 0) return
    const text = selected.length === 1 ? selected[0] : selected.join("\n")
    navigator.clipboard.writeText(text).then(() => toast.success("Путь скопирован"))
  }, [getSelectedPaths])

  const handleOpenInExplorer = useCallback(async () => {
    const selected = getSelectedPaths()
    if (selected.length === 0) return
    const path = selected[0]
    try {
      await openPath(path)
    } catch (error) {
      toast.error(`Не удалось открыть: ${error}`)
    }
  }, [getSelectedPaths])

  const handleOpenInTerminal = useCallback(async () => {
    const selected = getSelectedPaths()
    if (selected.length === 0) return
    const path = selected[0]
    try {
      await openPath(path)
    } catch (error) {
      toast.error(`Не удалось открыть терминал: ${error}`)
    }
  }, [getSelectedPaths])

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
    handleStartNewFolder,
    handleStartNewFile,
    handleStartRename,
    handleStartRenameAt,
    handleCopyPath,
    handleOpenInExplorer,
    handleOpenInTerminal,
    getSelectedPaths,
  }
}
