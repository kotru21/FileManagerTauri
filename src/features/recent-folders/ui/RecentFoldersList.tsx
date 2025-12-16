import { Clock, Folder, Trash2, X } from "lucide-react"
import { useCallback } from "react"
import { cn, formatRelativeDate } from "@/shared/lib"
import {
  Button,
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ScrollArea,
} from "@/shared/ui"
import { type RecentFolder, useRecentFoldersStore } from "../model/store"

interface RecentFoldersListProps {
  onSelect: (path: string) => void
  currentPath?: string
  maxItems?: number
  className?: string
}

interface RecentFolderItemProps {
  folder: RecentFolder
  isActive: boolean
  onSelect: () => void
  onRemove: () => void
}

function RecentFolderItem({ folder, isActive, onSelect, onRemove }: RecentFolderItemProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          role="button"
          tabIndex={0}
          onClick={onSelect}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              onSelect()
            }
          }}
          className={cn(
            "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm",
            "hover:bg-accent transition-colors text-left group",
            isActive && "bg-accent",
          )}
          title={folder.path}
        >
          <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <div className="truncate">{folder.name}</div>
            <div className="text-xs text-muted-foreground truncate">
              {formatRelativeDate(folder.lastVisited)}
            </div>
          </div>
          <div
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === "Enter" || e.key === " ") {
                e.stopPropagation()
                e.preventDefault()
                onRemove()
              }
            }}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-background rounded transition-opacity"
          >
            <X className="h-3 w-3" />
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={onSelect}>
          <Folder className="h-4 w-4 mr-2" />
          Открыть
        </ContextMenuItem>
        <ContextMenuItem onClick={onRemove} className="text-destructive">
          <Trash2 className="h-4 w-4 mr-2" />
          Удалить из списка
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

export function RecentFoldersList({
  onSelect,
  currentPath,
  maxItems = 10,
  className,
}: RecentFoldersListProps) {
  const { folders, removeFolder, clearAll } = useRecentFoldersStore()
  const recentFolders = folders.slice(0, maxItems)

  const handleRemove = useCallback(
    (path: string) => {
      removeFolder(path)
    },
    [removeFolder],
  )

  if (recentFolders.length === 0) {
    return (
      <div className={cn("px-2 py-4 text-center text-sm text-muted-foreground", className)}>
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>Нет недавних папок</p>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex items-center justify-between px-2 py-1">
        <span className="text-xs font-medium text-muted-foreground uppercase">Недавние</span>
        <Button variant="ghost" size="sm" onClick={clearAll} className="h-6 px-2 text-xs">
          Очистить
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-0.5 px-1">
          {recentFolders.map((folder) => (
            <RecentFolderItem
              key={folder.path}
              folder={folder}
              isActive={folder.path === currentPath}
              onSelect={() => onSelect(folder.path)}
              onRemove={() => handleRemove(folder.path)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
