import { useRef, useCallback, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { FileEntry } from "@/shared/api/tauri";
import { FileRow, ColumnHeader } from "@/entities/file-entry";
import { useLayoutStore } from "@/features/layout";
import { useKeyboardNavigation } from "@/features/keyboard-navigation";
import { cn } from "@/shared/lib";

interface VirtualFileListProps {
  files: FileEntry[];
  selectedPaths: Set<string>;
  onSelect: (path: string, e: React.MouseEvent) => void;
  onOpen: (path: string, isDir: boolean) => void;
  onDrop?: (sources: string[], destination: string) => void;
  getSelectedPaths?: () => string[];
  className?: string;
}

const ROW_HEIGHT = 28;
const OVERSCAN = 5;

export function VirtualFileList({
  files,
  selectedPaths,
  onSelect,
  onOpen,
  onDrop,
  getSelectedPaths,
  className,
}: VirtualFileListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const { layout, setColumnWidth } = useLayoutStore();

  // Keyboard navigation
  const { focusedIndex } = useKeyboardNavigation({
    files,
    selectedPaths,
    onSelect: useCallback(
      (path: string, e: { ctrlKey?: boolean; shiftKey?: boolean }) => {
        // Create synthetic mouse event for compatibility
        const syntheticEvent = {
          ctrlKey: e.ctrlKey ?? false,
          shiftKey: e.shiftKey ?? false,
          preventDefault: () => {},
          stopPropagation: () => {},
        } as React.MouseEvent;
        onSelect(path, syntheticEvent);
      },
      [onSelect]
    ),
    onOpen: useCallback(
      (path: string, isDir: boolean) => onOpen(path, isDir),
      [onOpen]
    ),
    enabled: true,
  });

  const virtualizer = useVirtualizer({
    count: files.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: OVERSCAN,
  });

  // Memoize handlers
  const handleColumnResize = useCallback(
    (column: "size" | "date" | "padding", width: number) => {
      setColumnWidth(column, Math.max(50, Math.min(400, width)));
    },
    [setColumnWidth]
  );

  // Memoize file path getter
  const memoizedGetSelectedPaths = useCallback(() => {
    return getSelectedPaths?.() ?? Array.from(selectedPaths);
  }, [getSelectedPaths, selectedPaths]);

  // Create stable handlers for each row
  const createRowHandlers = useMemo(() => {
    return files.map((file) => ({
      onSelect: (e: React.MouseEvent) => onSelect(file.path, e),
      onOpen: () => onOpen(file.path, file.is_dir),
    }));
  }, [files, onSelect, onOpen]);

  if (files.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center h-full text-muted-foreground",
          className
        )}>
        Папка пуста
      </div>
    );
  }

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <ColumnHeader
        columnWidths={layout.columnWidths}
        onColumnResize={handleColumnResize}
        className="shrink-0"
      />

      <div ref={parentRef} className="flex-1 overflow-auto">
        <div
          style={{
            height: virtualizer.getTotalSize(),
            width: "100%",
            position: "relative",
          }}>
          {virtualItems.map((virtualRow) => {
            const file = files[virtualRow.index];
            const handlers = createRowHandlers[virtualRow.index];
            const isSelected = selectedPaths.has(file.path);
            const isFocused = focusedIndex === virtualRow.index;

            return (
              <div
                key={file.path}
                data-index={virtualRow.index}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: ROW_HEIGHT,
                  transform: `translateY(${virtualRow.start}px)`,
                }}>
                <FileRow
                  file={file}
                  isSelected={isSelected}
                  isFocused={isFocused}
                  onSelect={handlers.onSelect}
                  onOpen={handlers.onOpen}
                  onDrop={onDrop}
                  getSelectedPaths={memoizedGetSelectedPaths}
                  columnWidths={layout.columnWidths}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
