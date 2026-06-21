import {
  Clipboard,
  Copy,
  FilePlus,
  FolderOpen,
  FolderPlus,
  Link,
  Pencil,
  RefreshCw,
  Scissors,
  Star,
  Terminal,
  Trash2,
} from "lucide-react"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/shared/ui"

interface FileContextMenuProps {
  children: React.ReactNode
  selectedPaths: string[]
  onCopy: () => void
  onCut: () => void
  onPaste: () => void
  onDelete: () => void
  onRename: () => void
  onNewFolder: () => void
  onNewFile: () => void
  onRefresh: () => void
  onCopyPath?: () => void
  onOpenInExplorer?: () => void
  onOpenInTerminal?: () => void
  canPaste: boolean
  isPathBookmarked: (path: string) => boolean
  onToggleBookmark: (path: string) => void
}

export function FileContextMenu({
  children,
  selectedPaths,
  onCopy,
  onCut,
  onPaste,
  onDelete,
  onRename,
  onNewFolder,
  onNewFile,
  onRefresh,
  onCopyPath,
  onOpenInExplorer,
  onOpenInTerminal,
  canPaste,
  isPathBookmarked,
  onToggleBookmark,
}: FileContextMenuProps) {
  const selected = selectedPaths ?? []
  const hasSelection = selected.length > 0
  const singleSelection = selected.length === 1

  const selectedPath = singleSelection ? selected[0] : null
  const isBookmark = selectedPath ? isPathBookmarked(selectedPath) : false

  const handleToggleBookmark = () => {
    if (!selectedPath) return
    onToggleBookmark(selectedPath)
  }

  const handleCopyPath = () => {
    if (selectedPath) {
      navigator.clipboard.writeText(selectedPath)
    } else if (onCopyPath) {
      onCopyPath()
    }
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        {/* Open actions */}
        {hasSelection && (
          <>
            <ContextMenuItem onClick={onOpenInExplorer}>
              <FolderOpen className="mr-2 h-4 w-4" />
              Открыть в проводнике
            </ContextMenuItem>
            {onOpenInTerminal && (
              <ContextMenuItem onClick={onOpenInTerminal}>
                <Terminal className="mr-2 h-4 w-4" />
                Открыть в терминале
              </ContextMenuItem>
            )}
            <ContextMenuSeparator />
          </>
        )}

        {/* Clipboard actions */}
        <ContextMenuItem onClick={onCopy} disabled={!hasSelection}>
          <Copy className="mr-2 h-4 w-4" />
          Копировать
          <ContextMenuShortcut>Ctrl+C</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={onCut} disabled={!hasSelection}>
          <Scissors className="mr-2 h-4 w-4" />
          Вырезать
          <ContextMenuShortcut>Ctrl+X</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={onPaste} disabled={!canPaste}>
          <Clipboard className="mr-2 h-4 w-4" />
          Вставить
          <ContextMenuShortcut>Ctrl+V</ContextMenuShortcut>
        </ContextMenuItem>

        <ContextMenuSeparator />

        {/* Copy path */}
        <ContextMenuItem onClick={handleCopyPath} disabled={!singleSelection}>
          <Link className="mr-2 h-4 w-4" />
          Копировать путь
        </ContextMenuItem>

        {/* Bookmark */}
        {singleSelection && (
          <ContextMenuItem onClick={handleToggleBookmark}>
            <Star className="mr-2 h-4 w-4" />
            {isBookmark ? "Удалить из избранного" : "Добавить в избранное"}
            <ContextMenuShortcut>Ctrl+D</ContextMenuShortcut>
          </ContextMenuItem>
        )}

        <ContextMenuSeparator />

        {/* Edit actions */}
        <ContextMenuItem onClick={onRename} disabled={!singleSelection}>
          <Pencil className="mr-2 h-4 w-4" />
          Переименовать
          <ContextMenuShortcut>F2</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem
          onClick={onDelete}
          disabled={!hasSelection}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Удалить
          <ContextMenuShortcut>Delete</ContextMenuShortcut>
        </ContextMenuItem>

        <ContextMenuSeparator />

        {/* Create actions */}
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <FilePlus className="mr-2 h-4 w-4" />
            Создать
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem onClick={onNewFolder}>
              <FolderPlus className="mr-2 h-4 w-4" />
              Папку
              <ContextMenuShortcut>Ctrl+Shift+N</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem onClick={onNewFile}>
              <FilePlus className="mr-2 h-4 w-4" />
              Файл
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuSeparator />

        <ContextMenuItem onClick={onRefresh}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Обновить
          <ContextMenuShortcut>F5</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
