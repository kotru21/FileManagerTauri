import { Copy, Eye, FolderOpen, MoreHorizontal, Pencil, Scissors, Star, Trash2 } from "lucide-react"
import { memo } from "react"
import { useBookmarksStore } from "@/features/bookmarks"
import { cn } from "@/shared/lib"
import {
  Button,
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/ui"

interface FileRowActionsProps {
  path: string
  isDir: boolean
  onOpen: () => void
  onCopy: () => void
  onCut: () => void
  onRename: () => void
  onDelete: () => void
  onQuickLook?: () => void
  className?: string
}

export const FileRowActions = memo(function FileRowActions({
  path,
  isDir,
  onOpen,
  onCopy,
  onCut,
  onRename,
  onDelete,
  onQuickLook,
  className,
}: FileRowActionsProps) {
  const { isBookmarked, addBookmark, removeBookmark, getBookmarkByPath } = useBookmarksStore()

  const isPathBookmarked = isDir && isBookmarked(path)

  const handleToggleBookmark = () => {
    if (isPathBookmarked) {
      const bookmark = getBookmarkByPath(path)
      if (bookmark) removeBookmark(bookmark.id)
    } else {
      addBookmark(path)
    }
  }

  return (
    <div
      className={cn(
        "flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity",
        className,
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Quick actions */}
      {!isDir && onQuickLook && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onQuickLook}>
              <Eye className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Просмотр (Space)</TooltipContent>
        </Tooltip>
      )}

      {isDir && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-6 w-6", isPathBookmarked && "text-yellow-500")}
              onClick={handleToggleBookmark}
            >
              <Star className={cn("h-3.5 w-3.5", isPathBookmarked && "fill-current")} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            {isPathBookmarked ? "Удалить из закладок" : "Добавить в закладки"}
          </TooltipContent>
        </Tooltip>
      )}

      {/* More actions dropdown */}
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          <ContextMenuItem onClick={onOpen}>
            <FolderOpen className="h-4 w-4 mr-2" />
            Открыть
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={onCopy}>
            <Copy className="h-4 w-4 mr-2" />
            Копировать
          </ContextMenuItem>
          <ContextMenuItem onClick={onCut}>
            <Scissors className="h-4 w-4 mr-2" />
            Вырезать
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={onRename}>
            <Pencil className="h-4 w-4 mr-2" />
            Переименовать
          </ContextMenuItem>
          <ContextMenuItem onClick={onDelete} className="text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Удалить
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  )
})
