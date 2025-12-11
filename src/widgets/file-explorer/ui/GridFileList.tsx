import React from "react";
import type { FileEntry } from "@/shared/api/tauri";
import { FileCard } from "@/entities/file-entry";
import { cn } from "@/shared/lib";

interface GridFileListProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> {
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
  ...rest
}: GridFileListProps) {
  if (files.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center h-full text-muted-foreground",
          className
        )}
        onContextMenu={() => onEmptyContextMenu?.()}>
        Папка пуста
      </div>
    );
  }

  return (
    <div className={cn("flex-1 overflow-auto h-full", className)} {...rest}>
      <div className="p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
        {files.map((file) => (
          <div key={file.path}>
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

export default GridFileList;
