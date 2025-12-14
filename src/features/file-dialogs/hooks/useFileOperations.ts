import { useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"
import { fileKeys, useCreateDirectory, useCreateFile, useRenameEntry } from "@/entities/file-entry"
import { getBasename, joinPath, useDialogState } from "@/shared/lib"
import { toast } from "@/shared/ui"

interface UseFileOperationsOptions {
  currentPath: string | null
}

/**
 * Hook to manage file operations (create, rename)
 * Encapsulates dialog state and mutation logic
 */
export function useFileOperations({ currentPath }: UseFileOperationsOptions) {
  const queryClient = useQueryClient()

  // Dialog states
  const newFolderDialog = useDialogState("Новая папка")
  const newFileDialog = useDialogState("Новый файл.txt")
  const renameDialog = useDialogState<string>()

  // Mutations
  const createDirectory = useCreateDirectory()
  const createFile = useCreateFile()
  const renameEntry = useRenameEntry()

  // Dialog open handlers
  const handleNewFolder = useCallback(() => {
    newFolderDialog.open(null, "Новая папка")
  }, [newFolderDialog])

  const handleNewFile = useCallback(() => {
    newFileDialog.open(null, "Новый файл.txt")
  }, [newFileDialog])

  const handleRenameRequest = useCallback(
    (path: string) => {
      renameDialog.open(path, getBasename(path))
    },
    [renameDialog],
  )

  // Create/rename handlers
  const handleCreateFolder = useCallback(async () => {
    if (!currentPath || !newFolderDialog.state.value.trim()) return
    try {
      const path = joinPath(currentPath, newFolderDialog.state.value.trim())
      console.debug("creating directory:", path)
      await createDirectory.mutateAsync(path)
      newFolderDialog.close()
    } catch (error) {
      console.error("Failed to create folder:", error)
      const msg = error instanceof Error ? error.message : String(error)
      toast.error(`Не удалось создать папку: ${msg}`)
    }
  }, [currentPath, newFolderDialog, createDirectory])

  const handleCreateFile = useCallback(async () => {
    if (!currentPath || !newFileDialog.state.value.trim()) return
    try {
      await createFile.mutateAsync(joinPath(currentPath, newFileDialog.state.value.trim()))
      newFileDialog.close()
    } catch (error) {
      console.error("Failed to create file:", error)
      const msg = error instanceof Error ? error.message : String(error)
      toast.error(`Не удалось создать файл: ${msg}`)
    }
  }, [currentPath, newFileDialog, createFile])

  const handleRename = useCallback(async () => {
    if (!renameDialog.state.data || !renameDialog.state.value.trim()) return
    try {
      await renameEntry.mutateAsync({
        oldPath: renameDialog.state.data,
        newName: renameDialog.state.value.trim(),
      })
      renameDialog.close()
    } catch (error) {
      console.error("Failed to rename:", error)
      const msg = error instanceof Error ? error.message : String(error)
      toast.error(`Не удалось переименовать: ${msg}`)
    }
  }, [renameDialog, renameEntry])

  const handleRefresh = useCallback(() => {
    if (currentPath) {
      queryClient.invalidateQueries({
        queryKey: fileKeys.directory(currentPath),
      })
    }
  }, [currentPath, queryClient])

  return {
    // Состояния диалогов
    newFolderDialog,
    newFileDialog,
    renameDialog,

    // Open handlers
    handleNewFolder,
    handleNewFile,
    handleRenameRequest,

    // Action handlers
    handleCreateFolder,
    handleCreateFile,
    handleRename,
    handleRefresh,

    // Loading states
    isCreatingFolder: createDirectory.isPending,
    isCreatingFile: createFile.isPending,
    isRenaming: renameEntry.isPending,
  }
}
