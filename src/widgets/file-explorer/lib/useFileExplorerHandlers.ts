import { openPath } from "@tauri-apps/plugin-opener"
import { useCallback } from "react"
import { useClipboardStore } from "@/features/clipboard"
import { useConfirmStore } from "@/features/confirm"
import { useSelectionStore } from "@/features/file-selection"
import { useInlineEditStore } from "@/features/inline-edit"
import { useNavigationStore } from "@/features/navigation"
import {
  createOperationDescription,
  useOperationsHistoryStore,
} from "@/features/operations-history"
import { useBehaviorSettings } from "@/features/settings"
import { useTabsStore } from "@/features/tabs"
import type { FileEntry } from "@/shared/api/tauri"
import { getBasename, joinPath } from "@/shared/lib"

import { toast } from "@/shared/ui"
import type { SelectionModifiers } from "../ui/types"
import { handleSelectionEvent } from "./selectionHandlers"

function getDirname(path: string): string {
  const normalized = (path ?? "").replace(/\\/g, "/").replace(/\/+$/, "")
  if (!normalized) return ""

  const idx = normalized.lastIndexOf("/")
  if (idx === -1) return ""
  if (idx === 0) return "/"
  return normalized.slice(0, idx)
}

interface UseFileExplorerHandlersOptions {
  files: FileEntry[]
  createDirectory: (path: string) => Promise<void>
  createFile: (path: string) => Promise<void>
  renameEntry: (params: { oldPath: string; newName: string }) => Promise<void>
  deleteEntries: (params: { paths: string[] }) => Promise<void>
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
  const { clear: clearClipboard } = useClipboardStore()
  const clipboardCopy = useClipboardStore((s) => s.copy)
  const clipboardCut = useClipboardStore((s) => s.cut)
  const openConfirm = useConfirmStore((s) => s.open)
  const behaviorSettings = useBehaviorSettings()
  const addOperation = useOperationsHistoryStore((s) => s.addOperation)
  const handleSelect = useCallback(
    (path: string, e: SelectionModifiers) => {
      if ((e.ctrlKey || e.metaKey) && behaviorSettings.openFoldersInNewTab) {
        const file = files.find((f) => f.path === path)
        if (file?.is_dir) {
          try {
            useTabsStore.getState().addTab(path)
            requestAnimationFrame(() => {
              navigate(path)
              if (!behaviorSettings.singleClickToSelect) clearSelection()
            })
          } catch {
            void 0
          }
          return
        }
      }
      const { shouldOpen } = handleSelectionEvent({
        path,
        e,
        files,
        behaviorSettings,
        selectFile,
        toggleSelection,
        selectRange,
        getSelectedPaths,
      })
      if (shouldOpen) {
        const file = files.find((f) => f.path === path)
        if (!file) return
        if (file.is_dir) {
          requestAnimationFrame(() => {
            navigate(path)
            if (!behaviorSettings.singleClickToSelect) clearSelection()
          })
        } else {
          try {
            openPath(path)
          } catch (error) {
            toast.error(`Не удалось открыть файл: ${error}`)
          }
        }
      }
    },
    [
      files,
      selectFile,
      toggleSelection,
      selectRange,
      getSelectedPaths,
      behaviorSettings,
      navigate,
      clearSelection,
    ],
  )

  const handleOpen = useCallback(
    async (path: string, isDir: boolean) => {
      if (isDir) {
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
  const handleDrop = useCallback(
    async (sources: string[], destination: string) => {
      try {
        await moveEntries({ sources, destination })
        toast.success(`Перемещено ${sources.length} элементов`)
        addOperation({
          type: "move",
          description: createOperationDescription("move", { sources, destination }),
          data: { sources, destination },
          canUndo: true,
        })
        clearSelection()
      } catch (error) {
        toast.error(`Ошибка перемещения: ${error}`)
      }
    },
    [moveEntries, addOperation, clearSelection],
  )
  const handleCreateFolder = useCallback(
    async (name: string) => {
      if (!currentPath) return
      try {
        const path = joinPath(currentPath, name)
        await createDirectory(path)
        toast.success(`Папка "${name}" создана`)
        addOperation({
          type: "create",
          description: createOperationDescription("create", { newPath: path }),
          data: { newPath: path },
          canUndo: true,
        })
      } catch (error) {
        toast.error(`Ошибка создания папки: ${error}`)
      }
      resetInlineEdit()
    },
    [currentPath, createDirectory, addOperation, resetInlineEdit],
  )

  const handleCreateFile = useCallback(
    async (name: string) => {
      if (!currentPath) return
      try {
        const path = joinPath(currentPath, name)
        await createFile(path)
        toast.success(`Файл "${name}" создан`)
        addOperation({
          type: "create",
          description: createOperationDescription("create", { newPath: path }),
          data: { newPath: path },
          canUndo: true,
        })
      } catch (error) {
        toast.error(`Ошибка создания файла: ${error}`)
      }
      resetInlineEdit()
    },
    [currentPath, createFile, addOperation, resetInlineEdit],
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
        const oldName = getBasename(oldPath)
        const newPath = joinPath(getDirname(oldPath), newName)
        addOperation({
          type: "rename",
          description: createOperationDescription("rename", { oldName, newName }),
          data: { oldPath, newPath, oldName, newName },
          canUndo: true,
        })
      } catch (error) {
        toast.error(`Ошибка переименования: ${error}`)
      }
      resetInlineEdit()
    },
    [renameEntry, addOperation, resetInlineEdit],
  )
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
    const { paths: clipboardPaths, action: clipboardAction } = useClipboardStore.getState()
    if (clipboardPaths.length === 0) return

    try {
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
        addOperation({
          type: "move",
          description: createOperationDescription("move", {
            sources: clipboardPaths,
            destination: currentPath,
          }),
          data: { sources: clipboardPaths, destination: currentPath },
          canUndo: true,
        })
      } else {
        await copyEntries({ sources: clipboardPaths, destination: currentPath })
        toast.success(`Скопировано ${clipboardPaths.length} элементов`)
        addOperation({
          type: "copy",
          description: createOperationDescription("copy", {
            sources: clipboardPaths,
            destination: currentPath,
          }),
          data: { sources: clipboardPaths, destination: currentPath },
          canUndo: false,
        })
      }
    } catch (error) {
      toast.error(`Ошибка вставки: ${error}`)
    }
  }, [
    currentPath,
    copyEntries,
    moveEntries,
    clearClipboard,
    addOperation,
    onStartCopyWithProgress,
    files,
    behaviorSettings.confirmOverwrite,
    openConfirm,
  ])

  const handleDelete = useCallback(async () => {
    const selected = getSelectedPaths()
    if (selected.length === 0) return

    try {
      await deleteEntries({ paths: selected })
      toast.success(`Удалено ${selected.length} элементов`)
      addOperation({
        type: "delete",
        description: createOperationDescription("delete", { deletedPaths: selected }),
        data: { deletedPaths: selected },
        canUndo: false,
      })
      clearSelection()
    } catch (error) {
      toast.error(`Ошибка удаления: ${error}`)
    }
  }, [getSelectedPaths, deleteEntries, addOperation, clearSelection])

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
