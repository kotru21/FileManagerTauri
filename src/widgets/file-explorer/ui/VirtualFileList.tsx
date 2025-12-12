// src/widgets/file-explorer/ui/VirtualFileList.tsx
import { useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useRef } from "react";
import type { FileEntry } from "@/entities/file-entry";
import { ColumnHeader, FileRow } from "@/entities/file-entry";
import { useLayoutStore } from "@/features/layout";
import { VIRTUALIZATION } from "@/shared/config";
import { cn } from "@/shared/lib";

// Исключаем оба конфликтующих свойства
interface VirtualFileListProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect" | "onDrop"> {
  files: FileEntry[];
  selectedPaths: Set<string>;
  onSelect: (path: string, e: React.MouseEvent) => void;
  onOpen: (path: string, isDir: boolean) => void;
  onEmptyContextMenu?: () => void;
  onFileDrop?: (sources: string[], destination: string) => void; // Переименовано
  getSelectedPaths?: () => string[];
  className?: string;
}

export function VirtualFileList({
  files,
  selectedPaths,
  onSelect,
  onOpen,
  onEmptyContextMenu,
  onFileDrop, // Переименовано
  getSelectedPaths,
  className,
  ...rest
}: VirtualFileListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const { layout, setColumnWidth } = useLayoutStore();
  const columnWidths = layout.columnWidths;

  const rowVirtualizer = useVirtualizer({
    count: files.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => VIRTUALIZATION.ROW_HEIGHT,
    overscan: VIRTUALIZATION.OVERSCAN,
  });

  const handleColumnResize = useCallback(
    (column: "size" | "date" | "padding", width: number) => {
      setColumnWidth(column, width);
    },
    [setColumnWidth]
  );

  const handleContextMenu = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const fileRow = target.closest("[data-file-row]");
    if (!fileRow && onEmptyContextMenu) {
      onEmptyContextMenu();
    }
  };

  return (
    <div className={cn("flex flex-col h-full", className)} {...rest}>
      <ColumnHeader
        columnWidths={columnWidths}
        onColumnResize={handleColumnResize}
        className="flex-shrink-0"
      />
      <div
        ref={parentRef}
        className="flex-1 overflow-auto"
        onContextMenu={handleContextMenu}>
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}>
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const file = files[virtualRow.index];
            return (
              <div
                key={file.path}
                data-file-row
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}>
                <FileRow
                  file={file}
                  isSelected={selectedPaths.has(file.path)}
                  onSelect={(e) => onSelect(file.path, e)}
                  onOpen={() => onOpen(file.path, file.is_dir)}
                  onDrop={onFileDrop}
                  getSelectedPaths={getSelectedPaths}
                  columnWidths={columnWidths}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
