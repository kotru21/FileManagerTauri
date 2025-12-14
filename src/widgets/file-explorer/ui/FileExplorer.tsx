import { useCallback, useMemo, useState, useEffect } from "react";
import { openPath } from "@tauri-apps/plugin-opener";
import {
  useDirectoryContents,
  useCopyEntries,
  useCopyEntriesParallel,
  useMoveEntries,
  useDeleteEntries,
  sortEntries,
  filterEntries,
  useFileWatcher,
  type SortConfig,
} from "@/entities/file-entry";
import { useSelectionStore } from "@/features/file-selection";
import { useNavigationStore } from "@/features/navigation";
import { useClipboardStore } from "@/features/clipboard";
import { FileContextMenu } from "@/features/context-menu";
import { VirtualFileList } from "./VirtualFileList";
import { CopyProgressDialog } from "@/widgets/progress-dialog";
import { toast } from "@/shared/ui";
import { cn } from "@/shared/lib";

interface FileExplorerProps {
  showHidden?: boolean;
  sortConfig?: SortConfig;
  onRenameRequest?: (path: string) => void;
  onNewFolderRequest?: () => void;
  onNewFileRequest?: () => void;
  className?: string;
}

const DEFAULT_SORT: SortConfig = { field: "name", direction: "asc" };

export function FileExplorer({
  showHidden = false,
  sortConfig = DEFAULT_SORT,
  onRenameRequest,
  onNewFolderRequest,
  onNewFileRequest,
  className,
}: FileExplorerProps) {
  const { currentPath, navigate } = useNavigationStore();
  const {
    selectedPaths,
    selectFile,
    selectRange,
    clearSelection,
    getSelectedPaths,
    selectAll,
  } = useSelectionStore();
  const {
    copy,
    cut,
    paths: clipboardPaths,
    action,
    clear,
    hasContent,
  } = useClipboardStore();

  // Progress dialog state
  const [showProgress, setShowProgress] = useState(false);

  // Data fetching
  const {
    data: files = [],
    isLoading,
    refetch,
  } = useDirectoryContents(currentPath);

  // File watcher
  useFileWatcher(currentPath);

  // Mutations
  const copyMutation = useCopyEntries();
  const copyParallelMutation = useCopyEntriesParallel();
  const moveMutation = useMoveEntries();
  const deleteMutation = useDeleteEntries();

  // Process files: filter and sort
  const processedFiles = useMemo(() => {
    const filtered = filterEntries(files, { showHidden });
    return sortEntries(filtered, sortConfig);
  }, [files, showHidden, sortConfig]);

  // Selection handlers
  const handleSelect = useCallback(
    (path: string, e: React.MouseEvent) => {
      if (e.shiftKey && selectedPaths.size > 0) {
        const allPaths = processedFiles.map((f) => f.path);
        const lastSelected = Array.from(selectedPaths).pop()!;
        selectRange(lastSelected, path, allPaths);
      } else if (e.ctrlKey || e.metaKey) {
        selectFile(path, true);
      } else {
        selectFile(path, false);
      }
    },
    [processedFiles, selectedPaths, selectFile, selectRange]
  );

  const handleOpen = useCallback(
    async (path: string, isDir: boolean) => {
      if (isDir) {
        clearSelection();
        navigate(path);
      } else {
        try {
          await openPath(path);
        } catch (error) {
          toast.error(`Не удалось открыть файл: ${error}`);
        }
      }
    },
    [navigate, clearSelection]
  );

  // Drag & drop handler
  const handleDrop = useCallback(
    async (sources: string[], destination: string) => {
      if (sources.length === 0) return;

      try {
        // Use parallel copy for multiple files
        if (sources.length > 3) {
          setShowProgress(true);
          await copyParallelMutation.mutateAsync({ sources, destination });
        } else {
          await copyMutation.mutateAsync({ sources, destination });
        }
        toast.success(`Скопировано ${sources.length} элемент(ов)`);
      } catch (error) {
        toast.error(`Ошибка копирования: ${error}`);
      } finally {
        setShowProgress(false);
      }
    },
    [copyMutation, copyParallelMutation]
  );

  // Clipboard operations
  const handleCopy = useCallback(() => {
    const paths = getSelectedPaths();
    if (paths.length > 0) {
      copy(paths);
      toast.info(`Скопировано в буфер: ${paths.length}`);
    }
  }, [copy, getSelectedPaths]);

  const handleCut = useCallback(() => {
    const paths = getSelectedPaths();
    if (paths.length > 0) {
      cut(paths);
      toast.info(`Вырезано: ${paths.length}`);
    }
  }, [cut, getSelectedPaths]);

  const handlePaste = useCallback(async () => {
    if (!currentPath || !hasContent()) return;

    try {
      if (clipboardPaths.length > 3) {
        setShowProgress(true);
      }

      if (action === "cut") {
        await moveMutation.mutateAsync({
          sources: clipboardPaths,
          destination: currentPath,
        });
        clear();
        toast.success("Перемещено");
      } else {
        if (clipboardPaths.length > 3) {
          await copyParallelMutation.mutateAsync({
            sources: clipboardPaths,
            destination: currentPath,
          });
        } else {
          await copyMutation.mutateAsync({
            sources: clipboardPaths,
            destination: currentPath,
          });
        }
        toast.success("Вставлено");
      }
    } catch (error) {
      toast.error(`Ошибка: ${error}`);
    } finally {
      setShowProgress(false);
    }
  }, [
    currentPath,
    clipboardPaths,
    action,
    hasContent,
    copyMutation,
    copyParallelMutation,
    moveMutation,
    clear,
  ]);

  const handleDelete = useCallback(async () => {
    const paths = getSelectedPaths();
    if (paths.length === 0) return;

    try {
      await deleteMutation.mutateAsync({ paths, permanent: false });
      clearSelection();
      toast.success(`Удалено: ${paths.length}`);
    } catch (error) {
      toast.error(`Ошибка удаления: ${error}`);
    }
  }, [deleteMutation, getSelectedPaths, clearSelection]);

  const handleRename = useCallback(() => {
    const paths = getSelectedPaths();
    if (paths.length === 1 && onRenameRequest) {
      onRenameRequest(paths[0]);
    }
  }, [getSelectedPaths, onRenameRequest]);

  const handleRefresh = useCallback(() => {
    refetch();
    toast.info("Обновлено");
  }, [refetch]);

  const handleSelectAll = useCallback(() => {
    selectAll(processedFiles.map((f) => f.path));
  }, [selectAll, processedFiles]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
        switch (e.key.toLowerCase()) {
          case "c":
            e.preventDefault();
            handleCopy();
            break;
          case "x":
            e.preventDefault();
            handleCut();
            break;
          case "v":
            e.preventDefault();
            handlePaste();
            break;
          case "a":
            e.preventDefault();
            handleSelectAll();
            break;
        }
      } else if (e.key === "Delete") {
        e.preventDefault();
        handleDelete();
      } else if (e.key === "F5") {
        e.preventDefault();
        handleRefresh();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    handleCopy,
    handleCut,
    handlePaste,
    handleDelete,
    handleSelectAll,
    handleRefresh,
  ]);

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center h-full", className)}>
        <div className="animate-pulse text-muted-foreground">Загрузка...</div>
      </div>
    );
  }

  return (
    <>
      <FileContextMenu
        selectedPaths={getSelectedPaths()}
        onCopy={handleCopy}
        onCut={handleCut}
        onPaste={handlePaste}
        onDelete={handleDelete}
        onRename={handleRename}
        onNewFolder={onNewFolderRequest ?? (() => {})}
        onNewFile={onNewFileRequest ?? (() => {})}
        onRefresh={handleRefresh}
        canPaste={hasContent()}>
        <VirtualFileList
          files={processedFiles}
          selectedPaths={selectedPaths}
          onSelect={handleSelect}
          onOpen={handleOpen}
          onDrop={handleDrop}
          getSelectedPaths={getSelectedPaths}
          className={className}
        />
      </FileContextMenu>

      <CopyProgressDialog
        open={showProgress}
        onCancel={() => setShowProgress(false)}
        onComplete={() => setShowProgress(false)}
      />
    </>
  );
}
