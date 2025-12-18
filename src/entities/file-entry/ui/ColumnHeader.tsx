import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"
import { useCallback, useRef } from "react"
import { useFileDisplaySettings } from "@/features/settings"
import { type SortConfig, type SortField, useSortingStore } from "@/features/sorting"
import { cn } from "@/shared/lib"

interface ColumnHeaderProps {
  columnWidths: {
    size: number
    date: number
    padding: number
  }
  onColumnResize: (column: "size" | "date" | "padding", width: number) => void
  className?: string
}

interface SortableHeaderProps {
  field: SortField
  label: string
  sortConfig: SortConfig
  onSort: (field: SortField) => void
  className?: string
}

function SortableHeader({ field, label, sortConfig, onSort, className }: SortableHeaderProps) {
  const isActive = sortConfig.field === field

  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className={cn(
        "flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors",
        isActive && "text-foreground",
        className,
      )}
    >
      {label}
      {isActive ? (
        sortConfig.direction === "asc" ? (
          <ArrowUp className="h-3 w-3" />
        ) : (
          <ArrowDown className="h-3 w-3" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-50" />
      )}
    </button>
  )
}

function ResizeHandle({ onResize }: { onResize: (delta: number) => void }) {
  const startXRef = useRef(0)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      startXRef.current = e.clientX

      const handleMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - startXRef.current
        startXRef.current = moveEvent.clientX
        onResize(delta)
      }

      const handleUp = () => {
        document.removeEventListener("mousemove", handleMove)
        document.removeEventListener("mouseup", handleUp)
      }

      document.addEventListener("mousemove", handleMove)
      document.addEventListener("mouseup", handleUp)
    },
    [onResize],
  )

  return (
    <div
      onMouseDown={handleMouseDown}
      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 transition-colors"
    />
  )
}

export function ColumnHeader({ columnWidths, onColumnResize, className }: ColumnHeaderProps) {
  const { sortConfig, setSortField } = useSortingStore()

  const handleResize = useCallback(
    (column: "size" | "date" | "padding") => (delta: number) => {
      const currentWidth = columnWidths[column]
      const minWidth = column === "padding" ? 0 : 60
      const newWidth = Math.max(minWidth, currentWidth + delta)
      onColumnResize(column, newWidth)
    },
    [columnWidths, onColumnResize],
  )

  return (
    <div
      className={cn(
        "group flex h-8 items-center border-b border-border bg-muted/50 px-2 text-xs font-medium text-muted-foreground select-none",
        className,
      )}
    >
      <span className="w-4.5 mr-3" /> {/* Icon placeholder */}
      {/* Name column */}
      <div className="relative flex-1 min-w-0 pr-2">
        <SortableHeader field="name" label="Имя" sortConfig={sortConfig} onSort={setSortField} />
        <ResizeHandle onResize={handleResize("size")} />
      </div>
      {/* Size column */}
      {useFileDisplaySettings().showFileSizes && (
        <div className="relative shrink-0 text-right pr-2" style={{ width: columnWidths.size }}>
          <SortableHeader
            field="size"
            label="Размер"
            sortConfig={sortConfig}
            onSort={setSortField}
            className="justify-end"
          />
          <ResizeHandle onResize={handleResize("date")} />
        </div>
      )}
      {/* Date column */}
      {useFileDisplaySettings().showFileDates && (
        <div className="relative shrink-0 text-right pr-2" style={{ width: columnWidths.date }}>
          <SortableHeader
            field="modified"
            label="Изменён"
            sortConfig={sortConfig}
            onSort={setSortField}
            className="justify-end"
          />
          <ResizeHandle onResize={handleResize("padding")} />
        </div>
      )}
      {/* Padding column */}
      <div className="shrink-0" style={{ width: columnWidths.padding }} />
    </div>
  )
}
