import { useRef, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { FileEntry } from "@/shared/api/tauri";
import { FileRow } from "@/entities/file-entry";

import { cn } from "@/shared/lib";

interface VirtualFileListProps {
  files: FileEntry[];
  selectedPaths: Set<string>;
  onSelect: (path: string, e: React.MouseEvent) => void;
  onOpen: (path: string, isDir: boolean) => void;
  className?: string;
}

export function VirtualFileList({
  files,
  selectedPaths,
  onSelect,
  onOpen,
  className,
}: VirtualFileListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: files.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32,
    overscan: 10,
  });

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const currentIndex = files.findIndex((f) => selectedPaths.has(f.path));
      let newIndex = currentIndex;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        newIndex = Math.min(currentIndex + 1, files.length - 1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        newIndex = Math.max(currentIndex - 1, 0);
      } else if (e.key === "Enter" && currentIndex >= 0) {
        const file = files[currentIndex];
        onOpen(file.path, file.is_dir);
        return;
      }

      if (newIndex !== currentIndex && newIndex >= 0) {
        const syntheticEvent = {
          ctrlKey: e.ctrlKey,
          shiftKey: e.shiftKey,
        } as React.MouseEvent;
        onSelect(files[newIndex].path, syntheticEvent);
        virtualizer.scrollToIndex(newIndex, { align: "auto" });
      }
    },
    [files, selectedPaths, onSelect, onOpen, virtualizer]
  );

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

  return (
    <div
      ref={parentRef}
      className={cn("h-full overflow-auto focus:outline-none", className)}
      tabIndex={0}
      onKeyDown={handleKeyDown}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const file = files[virtualRow.index];
          return (
            <div
              key={file.path}
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
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
