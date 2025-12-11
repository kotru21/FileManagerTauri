import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/shared/ui";
import {
  Copy,
  Scissors,
  Clipboard,
  Trash2,
  Pencil,
  Pin,
  FolderPlus,
  FilePlus,
  RefreshCw,
} from "lucide-react";
import { useHomeStore } from "@/features/home";
import type { FileEntry } from "@/shared/api/tauri";

interface FileContextMenuProps {
  children: React.ReactNode;
  selectedPaths: string[];
  selectedFiles?: FileEntry[];
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
  onDelete: () => void;
  onRename: () => void;
  onNewFolder: () => void;
  onNewFile: () => void;
  onRefresh: () => void;
  canPaste: boolean;
}

export function FileContextMenu({
  children,
  selectedPaths,
  selectedFiles,
  onCopy,
  onCut,
  onPaste,
  onDelete,
  onRename,
  onNewFolder,
  onNewFile,
  onRefresh,
  canPaste,
}: FileContextMenuProps) {
  const hasSelection = selectedPaths.length > 0;
  const singleSelection = selectedPaths.length === 1;
  const togglePin = useHomeStore((s) => s.togglePin);
  const removeItem = useHomeStore((s) => s.removeItem);
  const isSelectedPinned = useHomeStore((s) => {
    if (!singleSelection) return false;
    return s.items[selectedPaths[0]]?.pinned ?? false;
  });

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        {hasSelection && (
          <>
            <ContextMenuItem onClick={onCopy}>
              <Copy className="mr-2 h-4 w-4" />
              Копировать
              <ContextMenuShortcut>Ctrl+C</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem onClick={onCut}>
              <Scissors className="mr-2 h-4 w-4" />
              Вырезать
              <ContextMenuShortcut>Ctrl+X</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        )}

        <ContextMenuItem onClick={onPaste} disabled={!canPaste}>
          <Clipboard className="mr-2 h-4 w-4" />
          Вставить
          <ContextMenuShortcut>Ctrl+V</ContextMenuShortcut>
        </ContextMenuItem>

        <ContextMenuSeparator />

        {singleSelection && (
          <>
            <ContextMenuItem
              onClick={() =>
                togglePin(
                  selectedPaths[0],
                  selectedFiles?.find((f) => f.path === selectedPaths[0])
                    ?.is_dir,
                  selectedFiles?.find((f) => f.path === selectedPaths[0])?.name
                )
              }>
              <Pin className="mr-2 h-4 w-4" />
              {isSelectedPinned ? "Открепить" : "Закрепить"}
            </ContextMenuItem>
            <ContextMenuItem onClick={onRename}>
              <Pencil className="mr-2 h-4 w-4" />
              Переименовать
              <ContextMenuShortcut>F2</ContextMenuShortcut>
            </ContextMenuItem>
          </>
        )}

        {hasSelection && (
          <ContextMenuItem onClick={onDelete} variant="destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Удалить
            <ContextMenuShortcut>Del</ContextMenuShortcut>
          </ContextMenuItem>
        )}

        {singleSelection && (
          <ContextMenuItem onClick={() => removeItem(selectedPaths[0])}>
            <Trash2 className="mr-2 h-4 w-4" />
            Удалить из истории
          </ContextMenuItem>
        )}

        <ContextMenuSeparator />

        <ContextMenuItem onClick={onNewFolder}>
          <FolderPlus className="mr-2 h-4 w-4" />
          Новая папка
          <ContextMenuShortcut>Ctrl+Shift+N</ContextMenuShortcut>
        </ContextMenuItem>

        <ContextMenuItem onClick={onNewFile}>
          <FilePlus className="mr-2 h-4 w-4" />
          Новый файл
          <ContextMenuShortcut>Ctrl+N</ContextMenuShortcut>
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem onClick={onRefresh}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Обновить
          <ContextMenuShortcut>F5</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
