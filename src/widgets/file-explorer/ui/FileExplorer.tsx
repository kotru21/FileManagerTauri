// src/widgets/file-explorer/ui/FileExplorer.tsx

import { openPath } from "@tauri-apps/plugin-opener"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  filterEntries,
  type SortConfig,
  sortEntries,
  useCopyEntries,
  useCopyEntriesParallel,
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
import { cn, joinPath } from "@/shared/lib"
import { toast } from "@/shared/ui"
import { CopyProgressDialog } from "@/widgets/progress-dialog"
import { VirtualFileList } from "./VirtualFileList"

interface FileExplorerProps {
  showHidden?: boolean
  sortConfig?: SortConfig
  className?: string
}

const DEFAULT_SORT: SortConfig = { field: "name", direction: "asc" }

export function FileExplorer({
  showHidden = false,
  sortConfig = DEFAULT_SORT,
  className,
}: FileExplorerProps) {
  const { currentPath, navigate } = useNavigationStore()
  const {
    selectedPaths,
    selectFile,
    selectRange,
    toggleSelection,
    clearSelection,
    selectAll,
    getSelectedPaths,
  } = useSelectionStore()

  const {
    paths: clipboardPaths,
    action: clipboardAction,
    copy,
    cut,
    clear: clearClipboard,
    hasContent,
  } = useClipboardStore()
  const {
    mode,
    startNewFolder,
    startNewFile,
    startRename,
    cancel: cancelInlineEdit,
  } = useInlineEditStore()

  // Progress dialog state
  const [showProgress, setShowProgress] = useState(false)

  // Data fetching (removed isLoading as it's unused)
  const { data: entries = [], refetch } = useDirectoryContents(currentPath)

  // File watcher
  useFileWatcher(currentPath)

  // Mutations with proper error handling
  const copyMutation = useCopyEntries()
  const copyParallelMutation = useCopyEntriesParallel()
  const moveMutation = useMoveEntries()
  const deleteMutation = useDeleteEntries()

  const createDirMutation = useCreateDirectory()
  const createFileMutation = useCreateFile()
  const renameMutation = useRenameEntry()

  // Process files: filter and sort
  const processedFiles = useMemo(() => {
    const filtered = filterEntries(entries, { showHidden })
    return sortEntries(filtered, sortConfig)
  }, [entries, showHidden, sortConfig])

  // Selection handlers
  const handleSelect = useCallback(
    (path: string, e: React.MouseEvent) => {
      if (e.shiftKey && selectedPaths.size > 0) {
        const allPaths = processedFiles.map((f) => f.path)
        const lastSelected = Array.from(selectedPaths).pop()
        if (!lastSelected) return
        selectRange(lastSelected, path, allPaths)
      } else if (e.ctrlKey || e.metaKey) {
        toggleSelection(path)
      } else {
        selectFile(path)
      }
    },
    [processedFiles, selectedPaths, selectFile, selectRange, toggleSelection],
  )

  const handleOpen = useCallback(
    async (path: string, isDir: boolean) => {
      if (isDir) {
        clearSelection()
        navigate(path)
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
      if (sources.length === 0) return

      try {
        if (sources.length > 3) {
          setShowProgress(true)
          await copyParallelMutation.mutateAsync({
            sources,
            destination,
          })
        } else {
          await copyMutation.mutateAsync({ sources, destination })
        }
        toast.success(`Скопировано ${sources.length} элементов`)
      } catch (error) {
        toast.error(`Ошибка копирования: ${error}`)
      } finally {
        setShowProgress(false)
      }
    },
    [copyMutation, copyParallelMutation],
  )

  // Inline create/rename handlers
  const handleCreateFolder = useCallback(
    async (name: string) => {
      if (!currentPath) return

      const fullPath = joinPath(currentPath, name)
      try {
        await createDirMutation.mutateAsync(fullPath)
        toast.success(`Папка "${name}" создана`)
      } catch (error) {
        toast.error(`Ошибка создания папки: ${error}`)
      }
    },
    [currentPath, createDirMutation],
  )

  const handleCreateFile = useCallback(
    async (name: string) => {
      if (!currentPath) return

      const fullPath = joinPath(currentPath, name)
      try {
        await createFileMutation.mutateAsync(fullPath)
        toast.success(`Файл "${name}" создан`)
      } catch (error) {
        toast.error(`Ошибка создания файла: ${error}`)
      }
    },
    [currentPath, createFileMutation],
  )

  const handleRename = useCallback(
    async (oldPath: string, newName: string) => {
      try {
        await renameMutation.mutateAsync({ oldPath, newName })
        toast.success(`Переименовано в "${newName}"`)
      } catch (error) {
        toast.error(`Ошибка переименования: ${error}`)
      }
    },
    [renameMutation],
  )

  // Clipboard operations
  const handleCopy = useCallback(() => {
    const paths = getSelectedPaths()
    if (paths.length > 0) {
      copy(paths)
      toast.info(`Скопировано в буфер: ${paths.length} элементов`)
    }
  }, [getSelectedPaths, copy])

  const handleCut = useCallback(() => {
    const paths = getSelectedPaths()
    if (paths.length > 0) {
      cut(paths)
      toast.info(`Вырезано: ${paths.length} элементов`)
    }
  }, [getSelectedPaths, cut])

  const handlePaste = useCallback(async () => {
    if (!currentPath || !hasContent()) return

    try {
      if (clipboardPaths.length > 3) {
        setShowProgress(true)
      }

      if (clipboardAction === "copy") {
        if (clipboardPaths.length > 3) {
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
        toast.success(`Вставлено ${clipboardPaths.length} элементов`)
      } else if (clipboardAction === "cut") {
        await moveMutation.mutateAsync({
          sources: clipboardPaths,
          destination: currentPath,
        })
        clearClipboard()
        toast.success(`Перемещено ${clipboardPaths.length} элементов`)
      }
    } catch (error) {
      toast.error(`Ошибка вставки: ${error}`)
    } finally {
      setShowProgress(false)
    }
  }, [
    currentPath,
    clipboardPaths,
    clipboardAction,
    hasContent,
    copyMutation,
    copyParallelMutation,
    moveMutation,
    clearClipboard,
  ])

  const handleDelete = useCallback(async () => {
    const paths = getSelectedPaths()
    if (paths.length === 0) return

    try {
      await deleteMutation.mutateAsync({ paths, permanent: false })
      clearSelection()
      toast.success(`Удалено ${paths.length} элементов`)
    } catch (error) {
      toast.error(`Ошибка удаления: ${error}`)
    }
  }, [getSelectedPaths, deleteMutation, clearSelection])

  const handleRenameRequest = useCallback(() => {
    const paths = getSelectedPaths()
    if (paths.length === 1) {
      startRename(paths[0])
    }
  }, [getSelectedPaths, startRename])

  const handleNewFolder = useCallback(() => {
    if (currentPath) {
      startNewFolder(currentPath)
    }
  }, [currentPath, startNewFolder])

  const handleNewFile = useCallback(() => {
    if (currentPath) {
      startNewFile(currentPath)
    }
  }, [currentPath, startNewFile])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if in inline edit mode
      if (mode !== null) {
        if (e.key === "Escape") {
          cancelInlineEdit()
        }
        return
      }

      // Ignore if focus is in input
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return
      }

      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case "c":
            e.preventDefault()
            handleCopy()
            break
          case "x":
            e.preventDefault()
            handleCut()
            break
          case "v":
            e.preventDefault()
            handlePaste()
            break
          case "a":
            e.preventDefault()
            selectAll(processedFiles.map((f) => f.path))
            break
        }
      } else {
        switch (e.key) {
          case "Delete":
            e.preventDefault()
            handleDelete()
            break
          case "F2":
            e.preventDefault()
            handleRenameRequest()
            break
          case "F5":
            e.preventDefault()
            refetch()
            break
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [
    mode,
    cancelInlineEdit,
    handleCopy,
    handleCut,
    handlePaste,
    handleDelete,
    handleRenameRequest,
    selectAll,
    processedFiles,
    refetch,
  ])

  if (!currentPath) {
    return (
      <div
        className={cn("flex items-center justify-center h-full text-muted-foreground", className)}
      >
        Выберите диск или папку
      </div>
    )
  }

  return (
    <>
      <FileContextMenu
        selectedPaths={getSelectedPaths()}
        onCopy={handleCopy}
        onCut={handleCut}
        onPaste={handlePaste}
        onDelete={handleDelete}
        onRename={handleRenameRequest}
        onNewFolder={handleNewFolder}
        onNewFile={handleNewFile}
        onRefresh={() => refetch()}
        canPaste={hasContent()}
      >
        <VirtualFileList
          files={processedFiles}
          selectedPaths={selectedPaths}
          onSelect={handleSelect}
          onOpen={handleOpen}
          onDrop={handleDrop}
          getSelectedPaths={getSelectedPaths}
          onCreateFolder={handleCreateFolder}
          onCreateFile={handleCreateFile}
          onRename={handleRename}
          className={cn("h-full", className)}
        />
      </FileContextMenu>

      <CopyProgressDialog
        open={showProgress}
        onCancel={() => setShowProgress(false)}
        onComplete={() => {
          setShowProgress(false)
          refetch()
        }}
      />
    </>
  )
}
