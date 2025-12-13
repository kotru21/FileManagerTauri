import { memo, useCallback, useMemo, useState } from "react";
import type { FileEntry } from "@/entities/file-entry";
import { cn, formatBytes, formatDate } from "@/shared/lib";
import { FileIcon } from "./FileIcon";

interface FileRowProps {
  file: FileEntry;
  isSelected: boolean;
  isFocused?: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onOpen: () => void;
  onDrop?: (sources: string[], destination: string) => void;
  getSelectedPaths?: () => string[];
  columnWidths?: {
    size: number;
    date: number;
    padding: number;
  };
}

export const FileRow = memo(
  function FileRow({
    file,
    isSelected,
    isFocused = false,
    onSelect,
    onOpen,
    onDrop,
    getSelectedPaths,
    columnWidths = { size: 80, date: 140, padding: 12 },
  }: FileRowProps) {
    const [isDragOver, setIsDragOver] = useState(false);

    const formattedSize = useMemo(() => {
      return file.is_dir ? "" : formatBytes(file.size);
    }, [file.size, file.is_dir]);

    const formattedDate = useMemo(() => {
      return formatDate(file.modified);
    }, [file.modified]);

    const handleDragStart = useCallback(
      (e: React.DragEvent) => {
        const paths =
          isSelected && getSelectedPaths ? getSelectedPaths() : [file.path];
        e.dataTransfer.setData("application/json", JSON.stringify(paths));
        e.dataTransfer.effectAllowed = "copyMove";
      },
      [file.path, isSelected, getSelectedPaths]
    );

    const handleDrop = useCallback(
      (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);

        if (!file.is_dir || !onDrop) return;

        try {
          const paths: string[] = JSON.parse(
            e.dataTransfer.getData("application/json")
          );

          // Ensure not dropping into the same folder
          if (!paths.includes(file.path)) {
            onDrop(paths, file.path);
          }
        } catch {
          // Ignore parse errors
        }
      },
      [file.is_dir, file.path, onDrop]
    );

    const handleDragOver = useCallback(
      (e: React.DragEvent) => {
        e.preventDefault();
        if (file.is_dir) {
          setIsDragOver(true);
        }
      },
      [file.is_dir]
    );

    const handleDragLeave = useCallback(() => {
      setIsDragOver(false);
    }, []);

    return (
      <button
        type="button"
        data-file-row="true"
        draggable
        onDragStart={handleDragStart}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "flex items-center gap-0 px-3 py-1.5 cursor-pointer select-none",
          "hover:bg-accent/50 transition-colors",
          "w-full text-left",
          isSelected && "bg-accent",
          isFocused && !isSelected && "ring-1 ring-primary/50",
          isDragOver && file.is_dir && "bg-blue-500/20 ring-2 ring-blue-500"
        )}
        onClick={onSelect}
        onContextMenu={(e) => {
          // Right-click selects the file if it's not already selected.
          if (!isSelected) {
            onSelect(e);
          }
        }}
        onDoubleClick={onOpen}>
        <FileIcon extension={file.extension} isDir={file.is_dir} size={18} />

        <span className="flex-1 truncate text-sm ml-3">{file.name}</span>

        {!file.is_dir && (
          <span
            className="text-xs text-muted-foreground text-right shrink-0 px-2"
            style={{ width: columnWidths.size }}>
            {formattedSize}
          </span>
        )}

        <span
          className="text-xs text-muted-foreground text-right shrink-0 px-2"
          style={{ width: columnWidths.date }}>
          {formattedDate}
        </span>

        <span className="shrink-0" style={{ width: columnWidths.padding }} />
      </button>
    );
  },
  (prev, next) => {
    // Custom comparison: re-render only when these props change
    return (
      prev.file.path === next.file.path &&
      prev.file.name === next.file.name &&
      prev.file.name_lower === next.file.name_lower &&
      prev.file.modified === next.file.modified &&
      prev.file.size === next.file.size &&
      prev.file.is_dir === next.file.is_dir &&
      prev.file.extension === next.file.extension &&
      prev.isSelected === next.isSelected &&
      prev.isFocused === next.isFocused &&
      prev.columnWidths?.size === next.columnWidths?.size &&
      prev.columnWidths?.date === next.columnWidths?.date &&
      prev.columnWidths?.padding === next.columnWidths?.padding
    );
  }
);
