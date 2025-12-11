import { openPath } from "@tauri-apps/plugin-opener";
import { getExtension, formatRelativeDate } from "@/shared/lib";
import { FileIcon } from "@/entities/file-entry";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
} from "@/shared/ui";
import { useHomeStore } from "@/features/home";
import { Pin, Trash2 } from "lucide-react";
import { VIEW_MODES } from "@/shared/config";

interface HomeItemProps {
  item: import("../model/store").HomeItem;
  onOpenDir?: (path: string) => void;
  viewMode?: (typeof VIEW_MODES)[keyof typeof VIEW_MODES];
}

export function HomeItem({ item, onOpenDir, viewMode }: HomeItemProps) {
  const togglePin = useHomeStore((s) => s.togglePin);
  const removeItem = useHomeStore((s) => s.removeItem);
  const isPinned = useHomeStore((s) => s.items[item.path]?.pinned);

  const handleOpen = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (item.isDir) {
      onOpenDir?.(item.path);
    } else {
      try {
        await openPath(item.path);
      } catch (e) {
        console.error("Failed to open Home item:", e);
      }
    }
  };

  const extension = getExtension(item.name);

  // viewMode should be provided by parent to avoid cross-feature import
  const mode = viewMode ?? VIEW_MODES.list;

  if (mode === VIEW_MODES.grid) {
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div className="relative w-28 group" role="group">
            <button
              onDoubleClick={handleOpen}
              className="flex flex-col items-center gap-1 p-3 rounded-lg cursor-pointer select-none hover:bg-accent/50 w-full"
              aria-label={`Открыть ${item.name}`}
              tabIndex={0}>
              <FileIcon extension={extension} isDir={item.isDir} size={40} />
              <span className="text-xs text-center truncate w-full">
                {item.name}
              </span>
              <div className="text-xs text-muted-foreground mt-1 text-center w-full">
                {item.openCount}× •{" "}
                {formatRelativeDate(Math.floor(item.lastOpened / 1000))}
              </div>
            </button>

            {/* Overlay quick actions */}
            <div className="absolute inset-x-1 bottom-1 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <div className="flex gap-1 pointer-events-auto">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePin(item.path, item.isDir, item.name);
                  }}
                  title={isPinned ? "Открепить" : "Закрепить"}
                  aria-pressed={isPinned}
                  className="p-1 bg-background/80 rounded-md hover:bg-accent/60 shadow">
                  <Pin className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeItem(item.path);
                  }}
                  title="Удалить из истории"
                  aria-label={`Удалить ${item.name} из истории`}
                  className="p-1 bg-background/80 rounded-md hover:bg-destructive/60 text-destructive shadow">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent className="w-44">
          <ContextMenuItem
            onClick={() => togglePin(item.path, item.isDir, item.name)}>
            <Pin className="mr-2 h-4 w-4" />
            {isPinned ? "Открепить" : "Закрепить"}
          </ContextMenuItem>
          <ContextMenuItem onClick={() => removeItem(item.path)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Удалить из истории
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="group w-full">
          <button
            className="flex items-center gap-3 p-2 rounded hover:bg-accent/50 w-full text-left"
            onDoubleClick={handleOpen}
            aria-label={`Открыть ${item.name}`}>
            <FileIcon extension={extension} isDir={item.isDir} size={24} />
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate" title={item.name}>
                {item.name}
              </div>
              <div className="text-xs text-muted-foreground">
                {item.openCount}× •{" "}
                {formatRelativeDate(Math.floor(item.lastOpened / 1000))}
              </div>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePin(item.path, item.isDir, item.name);
                }}
                title={isPinned ? "Открепить" : "Закрепить"}
                aria-pressed={isPinned}
                className="pointer-events-auto p-1 bg-background/80 rounded-md hover:bg-accent/60 shadow">
                <Pin className="h-4 w-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeItem(item.path);
                }}
                title="Удалить из истории"
                aria-label={`Удалить ${item.name} из истории`}
                className="pointer-events-auto p-1 bg-background/80 rounded-md hover:bg-destructive/60 text-destructive shadow">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </button>
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-44">
        <ContextMenuItem
          onClick={() => togglePin(item.path, item.isDir, item.name)}>
          <Pin className="mr-2 h-4 w-4" />
          {isPinned ? "Открепить" : "Закрепить"}
        </ContextMenuItem>
        <ContextMenuItem onClick={() => removeItem(item.path)}>
          <Trash2 className="mr-2 h-4 w-4" />
          Удалить из истории
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

export default HomeItem;
