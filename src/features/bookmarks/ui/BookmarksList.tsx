import { Folder, Star, Trash2 } from "lucide-react"
import { useCallback } from "react"
import { cn } from "@/shared/lib"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ScrollArea,
} from "@/shared/ui"
import { type Bookmark, useBookmarksStore } from "../model/store"

interface BookmarksListProps {
  onSelect: (path: string) => void
  currentPath?: string
  className?: string
}

interface BookmarkItemProps {
  bookmark: Bookmark
  isActive: boolean
  onSelect: () => void
  onRemove: () => void
}

function BookmarkItem({ bookmark, isActive, onSelect, onRemove }: BookmarkItemProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          type="button"
          onClick={onSelect}
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
            "hover:bg-accent hover:text-accent-foreground",
            isActive && "bg-accent text-accent-foreground",
          )}
        >
          <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{bookmark.name}</span>
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={onRemove}>
          <Trash2 className="mr-2 h-4 w-4" />
          Удалить из избранного
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

export function BookmarksList({ onSelect, currentPath, className }: BookmarksListProps) {
  const { bookmarks, removeBookmark } = useBookmarksStore()

  const handleRemove = useCallback(
    (id: string) => {
      removeBookmark(id)
    },
    [removeBookmark],
  )

  if (bookmarks.length === 0) {
    return (
      <div className={cn("px-2 py-4 text-center text-sm text-muted-foreground", className)}>
        <Star className="mx-auto mb-2 h-8 w-8 opacity-50" />
        <p>Нет закладок</p>
        <p className="text-xs mt-1">Перетащите папку сюда или используйте Ctrl+D</p>
      </div>
    )
  }

  return (
    <ScrollArea className={cn("h-full", className)}>
      <div className="space-y-0.5 p-2">
        {bookmarks
          .sort((a, b) => a.order - b.order)
          .map((bookmark) => (
            <BookmarkItem
              key={bookmark.id}
              bookmark={bookmark}
              isActive={currentPath === bookmark.path}
              onSelect={() => onSelect(bookmark.path)}
              onRemove={() => handleRemove(bookmark.id)}
            />
          ))}
      </div>
    </ScrollArea>
  )
}
