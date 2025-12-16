import { Filter, X } from "lucide-react"
import { useCallback, useEffect, useRef } from "react"
import { cn } from "@/shared/lib"
import { Button, Input } from "@/shared/ui"
import { useQuickFilterStore } from "../model/store"

interface QuickFilterBarProps {
  totalCount: number
  filteredCount: number
  className?: string
}

export function QuickFilterBar({ totalCount, filteredCount, className }: QuickFilterBarProps) {
  const { filter, isActive, setFilter, deactivate } = useQuickFilterStore()
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when activated
  useEffect(() => {
    if (isActive && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isActive])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        deactivate()
      }
    },
    [deactivate],
  )

  const handleClear = useCallback(() => {
    setFilter("")
    inputRef.current?.focus()
  }, [setFilter])

  if (!isActive) {
    return null
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 bg-muted/50 border-b border-border",
        className,
      )}
    >
      <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
      <Input
        ref={inputRef}
        type="text"
        placeholder="Фильтр по имени..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        onKeyDown={handleKeyDown}
        className="h-7 text-sm flex-1 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0"
      />
      {filter && (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {filteredCount} из {totalCount}
        </span>
      )}
      {filter && (
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleClear}>
          <X className="h-3 w-3" />
        </Button>
      )}
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={deactivate}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}
