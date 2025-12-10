import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateDirectory,
  useCreateFile,
  useRenameEntry,
  fileKeys,
} from "@/entities/file-entry";
import { joinPath, getBasename, useDialogState } from "@/shared/lib";

interface UseFileOperationsOptions {
  currentPath: string | null;
}

/**
 * Хук для управления файловыми операциями (создание, переименование)
 * Инкапсулирует состояние диалогов и логику мутаций
 */
export function useFileOperations({ currentPath }: UseFileOperationsOptions) {
  const queryClient = useQueryClient();

  // Состояния диалогов
  const newFolderDialog = useDialogState("Новая папка");
  const newFileDialog = useDialogState("Новый файл.txt");
  const renameDialog = useDialogState<string>();

  // Мутации
  const createDirectory = useCreateDirectory();
  const createFile = useCreateFile();
  const renameEntry = useRenameEntry();

  // Обработчики открытия диалогов
  const handleNewFolder = useCallback(() => {
    newFolderDialog.open(null, "Новая папка");
  }, [newFolderDialog]);

  const handleNewFile = useCallback(() => {
    newFileDialog.open(null, "Новый файл.txt");
  }, [newFileDialog]);

  const handleRenameRequest = useCallback(
    (path: string) => {
      renameDialog.open(path, getBasename(path));
    },
    [renameDialog]
  );

  // Обработчики создания/переименования
  const handleCreateFolder = useCallback(async () => {
    if (!currentPath || !newFolderDialog.state.value.trim()) return;
    try {
      await createDirectory.mutateAsync(
        joinPath(currentPath, newFolderDialog.state.value.trim())
      );
      newFolderDialog.close();
    } catch (error) {
      console.error("Failed to create folder:", error);
    }
  }, [currentPath, newFolderDialog, createDirectory]);

  const handleCreateFile = useCallback(async () => {
    if (!currentPath || !newFileDialog.state.value.trim()) return;
    try {
      await createFile.mutateAsync(
        joinPath(currentPath, newFileDialog.state.value.trim())
      );
      newFileDialog.close();
    } catch (error) {
      console.error("Failed to create file:", error);
    }
  }, [currentPath, newFileDialog, createFile]);

  const handleRename = useCallback(async () => {
    if (!renameDialog.state.data || !renameDialog.state.value.trim()) return;
    try {
      await renameEntry.mutateAsync({
        oldPath: renameDialog.state.data,
        newName: renameDialog.state.value.trim(),
      });
      renameDialog.close();
    } catch (error) {
      console.error("Failed to rename:", error);
    }
  }, [renameDialog, renameEntry]);

  const handleRefresh = useCallback(() => {
    if (currentPath) {
      queryClient.invalidateQueries({
        queryKey: fileKeys.directory(currentPath),
      });
    }
  }, [currentPath, queryClient]);

  return {
    // Состояния диалогов
    newFolderDialog,
    newFileDialog,
    renameDialog,

    // Обработчики открытия
    handleNewFolder,
    handleNewFile,
    handleRenameRequest,

    // Обработчики действий
    handleCreateFolder,
    handleCreateFile,
    handleRename,
    handleRefresh,

    // Состояния загрузки
    isCreatingFolder: createDirectory.isPending,
    isCreatingFile: createFile.isPending,
    isRenaming: renameEntry.isPending,
  };
}
