import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { cn } from "@/shared/lib"

export type SortField = "name" | "size" | "modified" | "type"
export type SortDirection = "asc" | "desc"
export interface SortConfig {
  field: SortField
  direction: SortDirection
}

interface ColumnHeaderProps {
  columnWidths: {
    size: number
    date: number
    padding: number
  }
  onColumnResize: (column: "size" | "date" | "padding", width: number) => void
  sortConfig: SortConfig
  onSort: (field: SortField) => void
  displaySettings?: {
    showFileSizes: boolean
    showFileDates: boolean
    thumbnailSize?: "small" | "medium" | "large"
  }
  className?: string
}

interface SortableHeaderProps {
  field: SortField
  label: string
  sortConfig: SortConfig
  onSort: (field: SortField) => void
  className?: string
}

const DEFAULT_WIDTHS = { size: 90, date: 140, padding: 16 }

function SortableHeader({ field, label, sortConfig, onSort, className }: SortableHeaderProps) {
  const isActive = sortConfig.field === field

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onSort(field)
      }}
      className={cn(
        "group/sort flex w-full items-center gap-1 text-xs font-medium text-muted-foreground transition-colors",
        "hover:text-foreground",
        isActive && "text-foreground",
        className,
      )}
    >
      <span className="truncate">{label}</span>
      {isActive ? (
        sortConfig.direction === "asc" ? (
          <ArrowUp className="h-3 w-3 shrink-0" />
        ) : (
          <ArrowDown className="h-3 w-3 shrink-0" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 shrink-0 opacity-0 group-hover/sort:opacity-50 transition-opacity" />
      )}
    </button>
  )
}

function ResizeHandle({
  onResize,
  onResetWidth,
}: {
  onResize: (delta: number) => void
  onResetWidth?: () => void
}) {
  const startXRef = useRef(0)
  const pendingDelta = useRef(0)
  const rafRef = useRef<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const flush = useCallback(() => {
    if (pendingDelta.current !== 0) {
      onResize(pendingDelta.current)
      pendingDelta.current = 0
    }
    if (rafRef.current !== null) {
      rafRef.current = null
    }
  }, [onResize])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      startXRef.current = e.clientX
      setIsDragging(true)

      // Override cursor on document during drag
      document.body.style.cursor = "col-resize"
      document.body.style.userSelect = "none"

      const handleMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - startXRef.current
        startXRef.current = moveEvent.clientX
        pendingDelta.current += delta
        if (rafRef.current === null) {
          rafRef.current = window.requestAnimationFrame(flush)
        }
      }

      const handleUp = () => {
        if (rafRef.current !== null) {
          window.cancelAnimationFrame(rafRef.current)
          rafRef.current = null
        }
        flush()
        setIsDragging(false)
        document.body.style.cursor = ""
        document.body.style.userSelect = ""
        document.removeEventListener("mousemove", handleMove)
        document.removeEventListener("mouseup", handleUp)
      }

      document.addEventListener("mousemove", handleMove)
      document.addEventListener("mouseup", handleUp)
    },
    [flush],
  )

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      onResetWidth?.()
    },
    [onResetWidth],
  )

  return (
    <div
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      className={cn(
        "absolute right-0 top-1 bottom-1 w-1.75 -mr-0.75 z-10 cursor-col-resize flex items-center justify-center",
        "before:absolute before:inset-y-0 before:w-px before:transition-colors before:duration-150",
        isDragging ? "before:bg-primary" : "before:bg-transparent hover:before:bg-border",
      )}
    />
  )
}

export function ColumnHeader({
  columnWidths,
  onColumnResize,
  className,
  sortConfig,
  onSort,
  displaySettings,
}: ColumnHeaderProps) {
  type ColumnKey = "size" | "date" | "padding"

  const columnWidthsRef = useRef(columnWidths)
  useEffect(() => {
    columnWidthsRef.current = columnWidths
  }, [columnWidths])

  const handleResize = useCallback(
    (column: ColumnKey) => (delta: number) => {
      const currentWidth = columnWidthsRef.current[column]
      const minWidth = column === "padding" ? 0 : 60
      const newWidth = Math.max(minWidth, currentWidth + delta)
      onColumnResize(column, newWidth)
    },
    [onColumnResize],
  )

  const handleResetWidth = useCallback(
    (column: ColumnKey) => () => {
      onColumnResize(column, DEFAULT_WIDTHS[column])
    },
    [onColumnResize],
  )

  const handleResizeBetween = useCallback(
    (left: Exclude<ColumnKey, "padding">, right: Exclude<ColumnKey, "padding">) =>
      (delta: number) => {
        const minWidth = 60
        const leftCurrent = columnWidthsRef.current[left]
        const rightCurrent = columnWidthsRef.current[right]
        let applied = delta
        if (delta > 0) {
          applied = Math.min(delta, rightCurrent - minWidth)
        } else if (delta < 0) {
          applied = Math.max(delta, -(leftCurrent - minWidth))
        }

        if (applied === 0) return

        onColumnResize(left, leftCurrent + applied)
        onColumnResize(right, rightCurrent - applied)
      },
    [onColumnResize],
  )

  const handleResetBetween = useCallback(
    (left: Exclude<ColumnKey, "padding">, right: Exclude<ColumnKey, "padding">) => () => {
      onColumnResize(left, DEFAULT_WIDTHS[left])
      onColumnResize(right, DEFAULT_WIDTHS[right])
    },
    [onColumnResize],
  )

  const showFileSizes = displaySettings?.showFileSizes ?? true
  const showFileDates = displaySettings?.showFileDates ?? true
  const thumbnailSize = displaySettings?.thumbnailSize ?? "medium"
  const iconSizeMap: Record<string, number> = { small: 14, medium: 18, large: 22 }
  const iconSlotWidth = iconSizeMap[thumbnailSize] ?? 18

  const effectiveSortConfig = sortConfig ?? { field: "name", direction: "asc" }
  const effectiveOnSort = onSort ?? (() => {})

  return (
    <div
      className={cn(
        "relative flex h-7 items-center gap-2 border-b border-border bg-muted/30 px-3 text-xs font-medium text-muted-foreground select-none",
        className,
      )}
    >
      <span className="shrink-0" style={{ width: iconSlotWidth }} />

      {/* Name column */}
      <div className="relative flex-1 min-w-0">
        <SortableHeader
          field="name"
          label="Имя"
          sortConfig={effectiveSortConfig}
          onSort={effectiveOnSort}
        />
      </div>

      {/* Size column */}
      {showFileSizes && (
        <div className="relative shrink-0 text-right pr-2" style={{ width: columnWidths.size }}>
          <SortableHeader
            field="size"
            label="Размер"
            sortConfig={effectiveSortConfig}
            onSort={effectiveOnSort}
            className="justify-end"
          />
          {(() => {
            if (showFileDates) {
              return (
                <ResizeHandle
                  onResize={handleResizeBetween("size", "date")}
                  onResetWidth={handleResetBetween("size", "date")}
                />
              )
            }
            return (
              <ResizeHandle
                onResize={handleResize("size")}
                onResetWidth={handleResetWidth("size")}
              />
            )
          })()}
        </div>
      )}

      {/* Date column */}
      {showFileDates && (
        <div className="relative shrink-0 text-right pr-2" style={{ width: columnWidths.date }}>
          <SortableHeader
            field="modified"
            label="Изменён"
            sortConfig={effectiveSortConfig}
            onSort={effectiveOnSort}
            className="justify-end"
          />
          <ResizeHandle onResize={handleResize("date")} onResetWidth={handleResetWidth("date")} />
        </div>
      )}

      {/* Right padding */}
      <div className="shrink-0" style={{ width: columnWidths.padding }} />
    </div>
  )
}
