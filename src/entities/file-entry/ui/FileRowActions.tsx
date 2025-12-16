import { Copy, Eye, FolderOpen, MoreHorizontal, Pencil, Scissors, Star, Trash2 } from "lucide-react"
import { memo, useCallback } from "react"
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
  isDir: boolean
  isBookmarked?: boolean
  onOpen: () => void
  onCopy: () => void
  onCut: () => void
  onRename: () => void
  onDelete: () => void
  onQuickLook?: () => void
  onToggleBookmark?: () => void
  className?: string
}

export const FileRowActions = memo(function FileRowActions({
  isDir,
  isBookmarked = false,
  onOpen,
  onCopy,
  onCut,
  onRename,
  onDelete,
  onQuickLook,
  onToggleBookmark,
  className,
}: FileRowActionsProps) {
  const handleToggleBookmark = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onToggleBookmark?.()
    },
    [onToggleBookmark],
  )

  const handleQuickLook = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onQuickLook?.()
    },
    [onQuickLook],
  )

  const stopPropagation = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
  }, [])

  return (
    <div className={cn("flex items-center gap-1 mr-2", className)} onClick={stopPropagation}>
      {/* Quick actions */}
      {onQuickLook && !isDir && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleQuickLook}>
              <Eye className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Quick Look</TooltipContent>
        </Tooltip>
      )}

      {isDir && onToggleBookmark && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-6 w-6", isBookmarked && "text-yellow-500")}
              onClick={handleToggleBookmark}
            >
              <Star className="h-3.5 w-3.5" fill={isBookmarked ? "currentColor" : "none"} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isBookmarked ? "Remove bookmark" : "Add bookmark"}</TooltipContent>
        </Tooltip>
      )}

      {/* More actions dropdown */}
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={onOpen}>
            <FolderOpen className="h-4 w-4 mr-2" />
            Open
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={onCopy}>
            <Copy className="h-4 w-4 mr-2" />
            Copy
          </ContextMenuItem>
          <ContextMenuItem onClick={onCut}>
            <Scissors className="h-4 w-4 mr-2" />
            Cut
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={onRename}>
            <Pencil className="h-4 w-4 mr-2" />
            Rename
          </ContextMenuItem>
          <ContextMenuItem onClick={onDelete} className="text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  )
})
