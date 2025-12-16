import { Filter, X } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { cn } from "@/shared/lib"
import { Button, Input } from "@/shared/ui"
import { useQuickFilterStore } from "../model/store"

interface QuickFilterBarProps {
  totalCount: number
  filteredCount: number
  className?: string
}

export function QuickFilterBar({ totalCount, filteredCount, className }: QuickFilterBarProps) {
  const { filter, setFilter, deactivate, clear, isActive } = useQuickFilterStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const [localValue, setLocalValue] = useState(filter)
  const debounceRef = useRef<number | undefined>(undefined)

  // Focus input when activated
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Sync local value with store
  useEffect(() => {
    setLocalValue(filter)
  }, [filter])

  // Debounced filter update
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setLocalValue(value)

      // Clear previous timeout
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }

      // Debounce the actual filter update
      debounceRef.current = window.setTimeout(() => {
        setFilter(value)
      }, 150)
    },
    [setFilter],
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current)
      }
    }
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        if (localValue) {
          clear()
          setLocalValue("")
        } else {
          deactivate()
        }
      }
    },
    [localValue, clear, deactivate],
  )

  const handleClear = useCallback(() => {
    clear()
    setLocalValue("")
    inputRef.current?.focus()
  }, [clear])

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
        value={localValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Фильтр..."
        className="h-7 text-sm flex-1 min-w-0"
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
