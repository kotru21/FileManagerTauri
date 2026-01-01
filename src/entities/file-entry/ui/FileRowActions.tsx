import { Eye, Star } from "lucide-react"
import { memo, useCallback } from "react"
import { cn } from "@/shared/lib"
import { Button, Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui"

interface FileRowActionsProps {
  isDir: boolean
  isBookmarked?: boolean
  onQuickLook?: () => void
  onToggleBookmark?: () => void
  className?: string
}

export const FileRowActions = memo(function FileRowActions({
  isDir,
  isBookmarked = false,
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
    <div
      className={cn("flex items-center gap-1", className)}
      onClick={stopPropagation}
      data-testid="file-actions"
    >
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
    </div>
  )
})
