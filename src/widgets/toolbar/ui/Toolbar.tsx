import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Eye,
  EyeOff,
  FilePlus,
  Filter,
  FolderPlus,
  LayoutGrid,
  RefreshCw,
  Search,
  Settings,
  Star,
} from "lucide-react"
import { useState } from "react"
import { useBookmarksStore } from "@/features/bookmarks"
import { useNavigationStore } from "@/features/navigation"
import { useQuickFilterStore } from "@/features/quick-filter"
import { SearchBar } from "@/features/search-content"
import { useFileDisplaySettings, useSettingsStore } from "@/features/settings"
import { ViewModeToggle } from "@/features/view-mode"
import { cn } from "@/shared/lib"
import { Button, Separator, Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui"

interface ToolbarProps {
  onRefresh: () => void
  onNewFolder: () => void
  onNewFile: () => void
  onSearch?: () => void
  onTogglePreview?: () => void
  showPreview?: boolean
  className?: string
}

export function Toolbar({
  onRefresh,
  onNewFolder,
  onNewFile,
  onSearch,
  onTogglePreview,
  showPreview,
  className,
}: ToolbarProps) {
  const currentPath = useNavigationStore((s) => s.currentPath)
  const goBack = useNavigationStore((s) => s.goBack)
  const goForward = useNavigationStore((s) => s.goForward)
  const goUp = useNavigationStore((s) => s.goUp)
  const canGoBack = useNavigationStore((s) => s.canGoBack)
  const canGoForward = useNavigationStore((s) => s.canGoForward)
  const displaySettings = useFileDisplaySettings()
  const isBookmarked = useBookmarksStore((s) => s.isBookmarked)
  const addBookmark = useBookmarksStore((s) => s.addBookmark)
  const removeBookmark = useBookmarksStore((s) => s.removeBookmark)
  const getBookmarkByPath = useBookmarksStore((s) => s.getBookmarkByPath)
  const openSettings = useSettingsStore((s) => s.open)
  const updateFileDisplay = useSettingsStore((s) => s.updateFileDisplay)

  const toggleHidden = () =>
    updateFileDisplay({ showHiddenFiles: !displaySettings.showHiddenFiles })

  const [showSearch, setShowSearch] = useState(false)

  const bookmarked = currentPath ? isBookmarked(currentPath) : false

  const handleToggleBookmark = () => {
    if (!currentPath) return
    if (bookmarked) {
      const bookmark = getBookmarkByPath(currentPath)
      if (bookmark) removeBookmark(bookmark.id)
    } else {
      addBookmark(currentPath)
    }
  }

  const toggleQuickFilter = useQuickFilterStore((s) => s.toggle)
  const isQuickFilterActive = useQuickFilterStore((s) => s.isActive)

  return (
    <div className={cn("flex items-center gap-1 p-2 border-b border-border", className)}>
      {/* Navigation */}
      <div className="flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={goBack}
              disabled={!canGoBack()}
              className="h-8 w-8"
              aria-label="Back"
              title="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Назад (Alt+←)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={goForward}
              disabled={!canGoForward()}
              className="h-8 w-8"
              aria-label="Forward"
              title="Forward"
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Вперёд (Alt+→)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={goUp}
              className="h-8 w-8"
              aria-label="Up"
              title="Up"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Вверх (Backspace)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onRefresh}
              className="h-8 w-8"
              aria-label="Refresh"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Обновить (F5)</TooltipContent>
        </Tooltip>
      </div>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* Create */}
      <div className="flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onNewFolder}
              className="h-8 w-8"
              aria-label="New folder"
              title="New folder"
            >
              <FolderPlus className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Новая папка (Ctrl+Shift+N)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onNewFile}
              className="h-8 w-8"
              aria-label="New file"
              title="New file"
            >
              <FilePlus className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Новый файл</TooltipContent>
        </Tooltip>
      </div>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* View */}
      <div className="flex items-center gap-1">
        <ViewModeToggle />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleHidden}
              className={cn("h-8 w-8", displaySettings.showHiddenFiles && "bg-accent")}
              aria-label={
                displaySettings.showHiddenFiles ? "Hide hidden files" : "Show hidden files"
              }
              title={displaySettings.showHiddenFiles ? "Hide hidden files" : "Show hidden files"}
            >
              {displaySettings.showHiddenFiles ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {displaySettings.showHiddenFiles ? "Скрыть скрытые файлы" : "Показать скрытые файлы"}
          </TooltipContent>
        </Tooltip>

        {onTogglePreview && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onTogglePreview}
                className={cn("h-8 w-8", showPreview && "bg-accent")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Панель предпросмотра</TooltipContent>
          </Tooltip>
        )}
      </div>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* Quick Filter */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Быстрый фильтр"
            onClick={toggleQuickFilter}
            className={cn("h-8 w-8", isQuickFilterActive && "bg-accent")}
          >
            <Filter className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Быстрый фильтр (Ctrl+Shift+F)</TooltipContent>
      </Tooltip>

      {/* Bookmark */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleBookmark}
            disabled={!currentPath}
            className={cn("h-8 w-8", bookmarked && "text-yellow-500")}
            aria-label={bookmarked ? "Remove bookmark" : "Add bookmark"}
            aria-pressed={bookmarked}
            title={bookmarked ? "Remove bookmark" : "Add bookmark"}
          >
            <Star className={cn("h-4 w-4", bookmarked && "fill-current")} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {bookmarked ? "Удалить из избранного" : "Добавить в избранное"} (Ctrl+D)
        </TooltipContent>
      </Tooltip>

      <div className="flex-1" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Настройки"
            onClick={openSettings}
            className="h-8 w-8"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Настройки (Ctrl+,)</TooltipContent>
      </Tooltip>

      {/* Search */}
      <div className="relative">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Поиск"
              onClick={() => {
                // Toggle local search popover
                setShowSearch((s) => !s)
                onSearch?.()
              }}
              className="h-8 w-8"
            >
              <Search className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Поиск (Ctrl+F)</TooltipContent>
        </Tooltip>

        {showSearch && (
          <div className="absolute right-0 top-full z-50 mt-2 w-[320px] rounded border bg-popover p-2 shadow-md popover-surface">
            <SearchBar
              className="w-full"
              onSearch={() => {
                // Close popover on search submit
                setShowSearch(false)
                onSearch?.()
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
