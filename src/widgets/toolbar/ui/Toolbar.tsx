import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  FilePlus,
  FolderPlus,
  Grid,
  Home,
  List,
  RefreshCw,
  Search,
} from "lucide-react"
import { useLayoutStore } from "@/features/layout"
import { useNavigationStore } from "@/features/navigation"
import { VIEW_MODES } from "@/shared/config"
import { cn } from "@/shared/lib"
import { Button, Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui"

interface ToolbarProps {
  onRefresh: () => void
  onNewFolder: () => void
  onNewFile: () => void
  onSearch: () => void
  className?: string
}

export function Toolbar({ onRefresh, onNewFolder, onNewFile, onSearch, className }: ToolbarProps) {
  const goBack = useNavigationStore((s) => s.goBack)
  const goForward = useNavigationStore((s) => s.goForward)
  const goUp = useNavigationStore((s) => s.goUp)
  const canGoBack = useNavigationStore((s) => s.canGoBack())
  const canGoForward = useNavigationStore((s) => s.canGoForward())
  const currentPath = useNavigationStore((s) => s.currentPath)
  const goHome = useNavigationStore((s) => s.goHome)
  const viewMode = useLayoutStore((s) => s.layout.viewMode ?? VIEW_MODES.list)
  const toggleViewMode = useLayoutStore((s) => s.toggleViewMode)

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" onClick={goBack} disabled={!canGoBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Назад (Alt+←)</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" onClick={goForward} disabled={!canGoForward}>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Вперёд (Alt+→)</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" onClick={goUp} disabled={!currentPath}>
            <ArrowUp className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Вверх (Alt+↑)</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" onClick={goHome} aria-pressed={!currentPath}>
            <Home className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Главная</TooltipContent>
      </Tooltip>

      <div className="w-px h-6 bg-border mx-1" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Обновить (F5)</TooltipContent>
      </Tooltip>

      <div className="w-px h-6 bg-border mx-1" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" onClick={onNewFolder}>
            <FolderPlus className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Новая папка (Ctrl+Shift+N)</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" onClick={onNewFile}>
            <FilePlus className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Новый файл (Ctrl+N)</TooltipContent>
      </Tooltip>

      <div className="w-px h-6 bg-border mx-1" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" onClick={onSearch}>
            <Search className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Поиск (Ctrl+F)</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => toggleViewMode()}
            aria-pressed={viewMode === VIEW_MODES.grid}
          >
            {viewMode === VIEW_MODES.grid ? (
              <Grid className="h-4 w-4" />
            ) : (
              <List className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>Переключить вид отображения (Список/Клетки)</TooltipContent>
      </Tooltip>
    </div>
  )
}
