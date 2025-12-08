import { useCallback, useMemo } from "react";

import {
  useDirectoryContents,
  useCopyEntries,
  useMoveEntries,
  useDeleteEntries,
  sortEntries,
  filterEntries,
  type SortConfig,
} from "@/entities/file-entry";
import { useSelectionStore } from "@/features/file-selection";
import { useNavigationStore } from "@/features/navigation";
import { useClipboardStore } from "@/features/clipboard";
import { FileContextMenu } from "@/features/context-menu";
import { VirtualFileList } from "./VirtualFileList";
import { cn } from "@/shared/lib";

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
  const currentPath = useNavigationStore((s) => s.currentPath);
  const navigate = useNavigationStore((s) => s.navigate);

  const { data: rawFiles = [], refetch } = useDirectoryContents(currentPath);

  const {
    selectedPaths,
    selectFile,
    selectRange,
    toggleSelection,
    clearSelection,
    getSelectedPaths,
  } = useSelectionStore();

  const {
    copy,
    cut,
    paths: clipboardPaths,
    isCut,
    clear: clearClipboard,
    hasContent,
  } = useClipboardStore();

  const copyMutation = useCopyEntries();
  const moveMutation = useMoveEntries();
  const deleteMutation = useDeleteEntries();

  const files = useMemo(() => {
    const filtered = filterEntries(rawFiles, { showHidden });
    return sortEntries(filtered, sortConfig);
  }, [rawFiles, showHidden, sortConfig]);

  const allPaths = useMemo(() => files.map((f) => f.path), [files]);

  const handleSelect = useCallback(
    (path: string, e: React.MouseEvent) => {
      const lastSelected = useSelectionStore.getState().lastSelectedPath;

      if (e.shiftKey && lastSelected) {
        selectRange(lastSelected, path, allPaths);
      } else if (e.ctrlKey || e.metaKey) {
        toggleSelection(path);
      } else {
        selectFile(path);
      }
    },
    [selectFile, selectRange, toggleSelection, allPaths]
  );

  const handleOpen = useCallback(
    (path: string, isDir: boolean) => {
      if (isDir) {
        clearSelection();
        navigate(path);
      } else {
        // TODO: Open file with default app
      }
    },
    [navigate, clearSelection]
  );

  const handleCopy = useCallback(() => {
    copy(getSelectedPaths());
  }, [copy, getSelectedPaths]);

  const handleCut = useCallback(() => {
    cut(getSelectedPaths());
  }, [cut, getSelectedPaths]);

  const handlePaste = useCallback(async () => {
    if (!currentPath || clipboardPaths.length === 0) return;

    try {
      if (isCut()) {
        await moveMutation.mutateAsync({
          sources: clipboardPaths,
          destination: currentPath,
        });
        clearClipboard();
      } else {
        await copyMutation.mutateAsync({
          sources: clipboardPaths,
          destination: currentPath,
        });
      }
    } catch (error) {
      console.error("Paste failed:", error);
    }
  }, [
    currentPath,
    clipboardPaths,
    isCut,
    moveMutation,
    copyMutation,
    clearClipboard,
  ]);

  const handleDelete = useCallback(async () => {
    const paths = getSelectedPaths();
    if (paths.length === 0) return;

    try {
      await deleteMutation.mutateAsync({ paths, permanent: false });
      clearSelection();
    } catch (error) {
      console.error("Delete failed:", error);
    }
  }, [deleteMutation, getSelectedPaths, clearSelection]);

  const handleRename = useCallback(() => {
    const paths = getSelectedPaths();
    if (paths.length === 1) {
      onRenameRequest?.(paths[0]);
    }
  }, [getSelectedPaths, onRenameRequest]);

  return (
    <FileContextMenu
      selectedPaths={getSelectedPaths()}
      onCopy={handleCopy}
      onCut={handleCut}
      onPaste={handlePaste}
      onDelete={handleDelete}
      onRename={handleRename}
      onNewFolder={() => onNewFolderRequest?.()}
      onNewFile={() => onNewFileRequest?.()}
      onRefresh={() => refetch()}
      canPaste={hasContent()}>
      <VirtualFileList
        files={files}
        selectedPaths={selectedPaths}
        onSelect={handleSelect}
        onOpen={handleOpen}
        className={cn("flex-1", className)}
      />
    </FileContextMenu>
  );
}
