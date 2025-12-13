// src/widgets/file-explorer/ui/GridFileList.tsx
import { useCallback, useRef } from "react";
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
  // Cache handlers to prevent creating closures inside map
  const selectHandlerCache = useRef<Map<string, (e: React.MouseEvent) => void>>(
    new Map()
  );
  const openHandlerCache = useRef<Map<string, () => void>>(new Map());
  const getSelectHandler = useCallback(
    (path: string) => {
      const cached = selectHandlerCache.current.get(path);
      if (cached) return cached;
      const handler = (e: React.MouseEvent) => onSelect(path, e);
      selectHandlerCache.current.set(path, handler);
      return handler;
    },
    [onSelect]
  );
  const getOpenHandler = useCallback(
    (path: string, isDir: boolean) => {
      const cached = openHandlerCache.current.get(path);
      if (cached) return cached;
      const handler = () => onOpen(path, isDir);
      openHandlerCache.current.set(path, handler);
      return handler;
    },
    [onOpen]
  );
  // Remove debug log in production code

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
              onSelect={getSelectHandler(file.path)}
              onOpen={getOpenHandler(file.path, file.is_dir)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
