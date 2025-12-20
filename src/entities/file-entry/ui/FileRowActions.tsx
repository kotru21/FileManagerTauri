import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { Copy, Eye, FolderOpen, MoreHorizontal, Pencil, Scissors, Star, Trash2 } from "lucide-react"
import { memo, useCallback } from "react"
import { cn } from "@/shared/lib"
import { Button, Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui"

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
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleQuickLook}
              aria-label="Quick Look"
              title="Quick Look"
            >
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
              aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
              aria-pressed={isBookmarked}
              title={isBookmarked ? "Remove bookmark" : "Add bookmark"}
            >
              <Star className="h-3.5 w-3.5" fill={isBookmarked ? "currentColor" : "none"} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isBookmarked ? "Remove bookmark" : "Add bookmark"}</TooltipContent>
        </Tooltip>
      )}

      {/* More actions dropdown (click to open) */}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            aria-label="More actions"
            title="More actions"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content
          align="end"
          className="z-50 min-w-32 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md popover-surface"
        >
          <DropdownMenu.Item
            className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none"
            onSelect={(e) => {
              e.preventDefault()
              onOpen()
            }}
          >
            <FolderOpen className="h-4 w-4 mr-2" />
            Open
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="-mx-1 my-1 h-px bg-border" />
          <DropdownMenu.Item
            className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none"
            onSelect={(e) => {
              e.preventDefault()
              onCopy()
            }}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none"
            onSelect={(e) => {
              e.preventDefault()
              onCut()
            }}
          >
            <Scissors className="h-4 w-4 mr-2" />
            Cut
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="-mx-1 my-1 h-px bg-border" />
          <DropdownMenu.Item
            className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none"
            onSelect={(e) => {
              e.preventDefault()
              onRename()
            }}
          >
            <Pencil className="h-4 w-4 mr-2" />
            Rename
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none text-destructive"
            onSelect={(e) => {
              e.preventDefault()
              onDelete()
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
  )
})
