import { Grid, List, Table } from "lucide-react"
import { cn } from "@/shared/lib"
import { Button, Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui"
import { useViewModeStore, type ViewMode } from "../model/store"

interface ViewModeToggleProps {
  className?: string
}

const VIEW_MODE_OPTIONS: { mode: ViewMode; icon: typeof List; label: string }[] = [
  { mode: "list", icon: List, label: "Список" },
  { mode: "grid", icon: Grid, label: "Сетка" },
  { mode: "details", icon: Table, label: "Таблица" },
]

export function ViewModeToggle({ className }: ViewModeToggleProps) {
  const { settings, setViewMode } = useViewModeStore()

  return (
    <div className={cn("flex items-center rounded-md border border-border", className)}>
      {VIEW_MODE_OPTIONS.map(({ mode, icon: Icon, label }) => (
        <Tooltip key={mode}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode(mode)}
              className={cn(
                "h-8 w-8 rounded-none first:rounded-l-md last:rounded-r-md",
                settings.mode === mode && "bg-accent text-accent-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  )
}
