import { Filter, X } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { usePerformanceSettings } from "@/entities/app-settings"
import { cn } from "@/shared/lib"
import { Button, Input } from "@/shared/ui"
import { useQuickFilterStore } from "../model/store"

interface QuickFilterBarProps {
  totalCount: number
  filteredCount: number
  className?: string
}

export function QuickFilterBar({ totalCount, filteredCount, className }: QuickFilterBarProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { filter, setFilter, deactivate } = useQuickFilterStore()
  const performanceSettings = usePerformanceSettings()

  const [localValue, setLocalValue] = useState(filter)

  // Focus input when activated
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Sync local value with store
  useEffect(() => {
    setLocalValue(filter)
  }, [filter])

  // Debounced filter update using settings
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setLocalValue(value)

      // Clear previous timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // Debounce the actual filter update
      timeoutRef.current = setTimeout(() => {
        setFilter(value)
      }, performanceSettings.debounceDelay)
    },
    [setFilter, performanceSettings.debounceDelay],
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        deactivate()
      }
    },
    [deactivate],
  )

  const handleClear = useCallback(() => {
    setLocalValue("")
    setFilter("")
    inputRef.current?.focus()
  }, [setFilter])

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 border-b bg-muted/30",
        "filter-bar transition-all duration-(--transition-duration)",
        className,
      )}
    >
      <Filter size={16} className="text-muted-foreground shrink-0" />

      <Input
        ref={inputRef}
        value={localValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Фильтр по имени..."
        className="h-7 flex-1"
      />

      <span className="text-xs text-muted-foreground shrink-0">
        {filteredCount} / {totalCount}
      </span>

      {localValue && (
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleClear}>
          <X size={14} />
        </Button>
      )}

      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={deactivate}>
        <X size={14} />
      </Button>
    </div>
  )
}
