// src/widgets/file-explorer/ui/GridFileList.tsx
import { useCallback, useEffect, useRef, useState } from "react";
import type { FileEntry } from "@/entities/file-entry";
import { FileCard } from "@/entities/file-entry";
import { cn } from "@/shared/lib";

interface GridFileListProps {
  files: FileEntry[];
  selectedPaths: Set<string>;
  onSelect: (path: string, e: React.MouseEvent) => void;
  onOpen: (path: string, isDir: boolean) => void;
  onEmptyContextMenu?: () => void;
  className?: string;
}

export function GridFileList({
  files,
  selectedPaths,
  onSelect,
  onOpen,
  onEmptyContextMenu,
  className,
}: GridFileListProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleContainerClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-file-card]")) {
        onEmptyContextMenu?.();
      }
    },
    [onEmptyContextMenu]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-file-card]") && onEmptyContextMenu) {
        onEmptyContextMenu();
      }
    },
    [onEmptyContextMenu]
  );

  // Debug
  console.log("GridFileList rendering, files count:", files.length);

  if (files.length === 0) {
    return (
      <div className={cn("flex items-center justify-center h-full", className)}>
        <div className="text-muted-foreground">Папка пуста</div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn("h-full w-full overflow-auto p-4", className)}
      onClick={handleContainerClick}
      onContextMenu={handleContextMenu}>
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
        }}>
        {files.map((file) => (
          <div key={file.path} data-file-card>
            <FileCard
              file={file}
              isSelected={selectedPaths.has(file.path)}
              onSelect={(e) => onSelect(file.path, e)}
              onOpen={() => onOpen(file.path, file.is_dir)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
