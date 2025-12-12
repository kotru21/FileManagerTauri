// src/widgets/file-explorer/ui/FileExplorer.tsx
import { openPath } from "@tauri-apps/plugin-opener";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  filterEntries,
  type SortConfig,
  sortEntries,
  useCopyEntries,
  useCopyEntriesParallel,
  useDeleteEntries,
  useDirectoryContents,
  useMoveEntries,
} from "@/entities/file-entry";
import { useClipboardStore } from "@/features/clipboard";
import { FileContextMenu } from "@/features/context-menu";
import { DeleteConfirmDialog } from "@/features/file-dialogs";
import { useSelectionStore } from "@/features/file-selection";
import { useHomeStore } from "@/features/home";
import { useLayoutStore } from "@/features/layout";
import { useNavigationStore } from "@/features/navigation";
import { VIEW_MODES } from "@/shared/config";
import { cn, getBasename } from "@/shared/lib";
import { toast } from "@/shared/ui";
import { CopyProgressDialog } from "@/widgets/progress-dialog";
import { GridFileList } from "./GridFileList";
import { VirtualFileList } from "./VirtualFileList";

interface FileExplorerProps {
  showHidden?: boolean;
  sortConfig?: SortConfig;
  onRenameRequest?: (path: string) => void;
  onNewFolderRequest?: () => void;
  onNewFileRequest?: () => void;
  className?: string;
}

export function FileExplorer({
  showHidden = false,
  sortConfig = { field: "name", direction: "asc" },
  onRenameRequest,
  onNewFolderRequest,
  onNewFileRequest,
  className,
}: FileExplorerProps) {
  const { currentPath, navigate } = useNavigationStore();
  const {
    data: files = [],
    isLoading,
    refetch,
  } = useDirectoryContents(currentPath);
  const {
    selectedPaths,
    selectFile,
    selectRange,
    toggleSelection,
    clearSelection,
    getSelectedPaths,
  } = useSelectionStore();

  const {
    paths: clipboardPaths,
    action: clipboardAction,
    copy,
    cut,
    clear: clearClipboard,
  } = useClipboardStore();
  const { trackOpen, togglePin, removeItem } = useHomeStore();
  const { layout } = useLayoutStore();

  // viewMode из store (lowercase значения)
  const viewMode = layout.viewMode ?? VIEW_MODES.list;
  // В начале компонента FileExplorer, после получения viewMode
  console.log(
    "Current viewMode:",
    viewMode,
    "VIEW_MODES.grid:",
    VIEW_MODES.grid
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletePermanent, setDeletePermanent] = useState(false);
  const [pathsToDelete, setPathsToDelete] = useState<string[]>([]);
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);

  const { mutateAsync: deleteEntries, isPending: isDeleting } =
    useDeleteEntries();
  const { mutateAsync: copyEntries } = useCopyEntries();
  const { mutateAsync: copyEntriesParallel } = useCopyEntriesParallel();
  const { mutateAsync: moveEntries } = useMoveEntries();

  const processedFiles = useMemo(() => {
    const filtered = filterEntries(files, { showHidden });
    return sortEntries(filtered, sortConfig);
  }, [files, showHidden, sortConfig]);

  const handleSelect = useCallback(
    (path: string, e: React.MouseEvent) => {
      if (e.shiftKey && selectedPaths.size > 0) {
        const allPaths = processedFiles.map((f) => f.path);
        const lastSelected = Array.from(selectedPaths).pop();
        if (lastSelected) {
          selectRange(lastSelected, path, allPaths);
        }
      } else if (e.ctrlKey || e.metaKey) {
        toggleSelection(path);
      } else {
        selectFile(path);
      }
    },
    [processedFiles, selectedPaths, selectFile, selectRange, toggleSelection]
  );

  const handleOpen = useCallback(
    async (path: string, isDir: boolean) => {
      const file = processedFiles.find((f) => f.path === path);
      const name = file?.name || getBasename(path);
      trackOpen(path, isDir, name);

      if (isDir) {
        navigate(path);
      } else {
        try {
          await openPath(path);
        } catch (error) {
          toast.error(`Не удалось открыть файл: ${error}`);
        }
      }
    },
    [processedFiles, navigate, trackOpen]
  );

  const handleEmptyContextMenu = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  const handleCopy = useCallback(() => {
    const paths = getSelectedPaths();
    if (paths.length > 0) {
      copy(paths);
      toast.success(`Скопировано: ${paths.length}`);
    }
  }, [copy, getSelectedPaths]);

  const handleCut = useCallback(() => {
    const paths = getSelectedPaths();
    if (paths.length > 0) {
      cut(paths);
      toast.success(`Вырезано: ${paths.length}`);
    }
  }, [cut, getSelectedPaths]);

  const handlePaste = useCallback(async () => {
    if (clipboardPaths.length === 0 || !currentPath) return;

    try {
      if (clipboardPaths.length > 5) {
        setProgressDialogOpen(true);
        await copyEntriesParallel({
          sources: clipboardPaths,
          destination: currentPath,
        });
        setProgressDialogOpen(false);
      } else if (clipboardAction === "copy") {
        await copyEntries({
          sources: clipboardPaths,
          destination: currentPath,
        });
      } else {
        await moveEntries({
          sources: clipboardPaths,
          destination: currentPath,
        });
      }

      if (clipboardAction === "cut") {
        clearClipboard();
      }
      toast.success("Операция выполнена");
    } catch (error) {
      setProgressDialogOpen(false);
      toast.error(`Ошибка: ${error}`);
    }
  }, [
    clipboardPaths,
    clipboardAction,
    currentPath,
    copyEntries,
    copyEntriesParallel,
    moveEntries,
    clearClipboard,
  ]);

  const handleDeleteRequest = useCallback(() => {
    const paths = getSelectedPaths();
    if (paths.length > 0) {
      setPathsToDelete(paths);
      setDeleteDialogOpen(true);
    }
  }, [getSelectedPaths]);

  const handleDeleteConfirm = useCallback(
    async ({ paths, permanent }: { paths: string[]; permanent: boolean }) => {
      try {
        await deleteEntries({ paths, permanent });
        clearSelection();
        setDeleteDialogOpen(false);
        toast.success(`Удалено: ${paths.length}`);
      } catch (error) {
        toast.error(`Ошибка удаления: ${error}`);
      }
    },
    [deleteEntries, clearSelection]
  );

  const handleRenameRequest = useCallback(() => {
    const paths = getSelectedPaths();
    if (paths.length === 1 && onRenameRequest) {
      onRenameRequest(paths[0]);
    }
  }, [getSelectedPaths, onRenameRequest]);

  const handleDrop = useCallback(
    async (sources: string[], destination: string) => {
      try {
        await moveEntries({ sources, destination });
        toast.success(`Перемещено: ${sources.length}`);
      } catch (error) {
        toast.error(`Ошибка перемещения: ${error}`);
      }
    },
    [moveEntries]
  );

  // Горячие клавиши
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.ctrlKey || e.metaKey) {
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
            processedFiles.forEach((f) => {
              selectFile(f.path, true);
            });
            break;
        }
      } else if (e.key === "Delete") {
        e.preventDefault();
        handleDeleteRequest();
      } else if (e.key === "F2") {
        e.preventDefault();
        handleRenameRequest();
      } else if (e.key === "F5") {
        e.preventDefault();
        refetch();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    handleCopy,
    handleCut,
    handlePaste,
    handleDeleteRequest,
    handleRenameRequest,
    processedFiles,
    selectFile,
    refetch,
  ]);

  const selectedFiles = useMemo(() => {
    return processedFiles.filter((f) => selectedPaths.has(f.path));
  }, [processedFiles, selectedPaths]);

  const isSelectedPinned = useMemo(() => {
    if (selectedFiles.length !== 1) return false;
    const { getPinned } = useHomeStore.getState();
    return getPinned().some((item) => item.path === selectedFiles[0].path);
  }, [selectedFiles]);

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center h-full", className)}>
        <div className="text-muted-foreground">Загрузка...</div>
      </div>
    );
  }

  if (processedFiles.length === 0) {
    return (
      <div className={cn("flex items-center justify-center h-full", className)}>
        <div className="text-muted-foreground">Папка пуста</div>
      </div>
    );
  }

  return (
    <>
      <FileContextMenu
        selectedPaths={getSelectedPaths()}
        selectedFiles={selectedFiles}
        onCopy={handleCopy}
        onCut={handleCut}
        onPaste={handlePaste}
        onDelete={handleDeleteRequest}
        onRename={handleRenameRequest}
        onNewFolder={onNewFolderRequest ?? (() => {})}
        onNewFile={onNewFileRequest ?? (() => {})}
        onRefresh={() => refetch()}
        canPaste={clipboardPaths.length > 0}
        togglePin={togglePin}
        removeItem={removeItem}
        isSelectedPinned={isSelectedPinned}>
        {/* Условный рендеринг: grid или list */}
        {viewMode === VIEW_MODES.grid ? (
          <GridFileList
            files={processedFiles}
            selectedPaths={selectedPaths}
            onSelect={handleSelect}
            onOpen={handleOpen}
            onEmptyContextMenu={handleEmptyContextMenu}
            className={cn("flex-1", className)}
          />
        ) : (
          <VirtualFileList
            files={processedFiles}
            selectedPaths={selectedPaths}
            onSelect={handleSelect}
            onOpen={handleOpen}
            onEmptyContextMenu={handleEmptyContextMenu}
            onFileDrop={handleDrop}
            getSelectedPaths={getSelectedPaths}
            className={cn("flex-1", className)}
          />
        )}
      </FileContextMenu>

      <DeleteConfirmDialog
        isOpen={deleteDialogOpen}
        paths={pathsToDelete}
        permanent={deletePermanent}
        onPermanentChange={setDeletePermanent}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
      />

      <CopyProgressDialog
        open={progressDialogOpen}
        onCancel={() => setProgressDialogOpen(false)}
        onComplete={() => setProgressDialogOpen(false)}
      />
    </>
  );
}
