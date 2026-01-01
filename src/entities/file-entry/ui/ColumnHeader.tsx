import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"
import { useCallback, useEffect, useRef } from "react"
import { cn } from "@/shared/lib"

// Local types to avoid importing from features
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
  // Sorting is provided by higher layer (widgets/pages)
  sortConfig: SortConfig
  onSort: (field: SortField) => void
  displaySettings?: {
    showFileSizes: boolean
    showFileDates: boolean
    // Optional: passed from higher layers (widgets) to keep header aligned with row icon size
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

function SortableHeader({ field, label, sortConfig, onSort, className }: SortableHeaderProps) {
  const isActive = sortConfig.field === field

  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className={cn(
        // w-full is important so justify-end actually aligns content to the same edge
        // as row cells which use text-right within a fixed-width span.
        "flex w-full items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors",
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
  const pendingDelta = useRef(0)
  const rafRef = useRef<number | null>(null)

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
      startXRef.current = e.clientX

      const handleMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - startXRef.current
        startXRef.current = moveEvent.clientX
        // accumulate delta and schedule a single RAF flush per frame
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
        document.removeEventListener("mousemove", handleMove)
        document.removeEventListener("mouseup", handleUp)
      }

      document.addEventListener("mousemove", handleMove)
      document.addEventListener("mouseup", handleUp)
    },
    [flush],
  )

  return (
    <div
      onMouseDown={handleMouseDown}
      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 transition-colors"
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

  // IMPORTANT:
  // During a drag, ResizeHandle's document-level mousemove handler keeps the
  // onResize callback from the initial mousedown. If that callback closes over
  // columnWidths from that render, widths will "jitter" (deltas apply to a stale
  // base) and columns appear not to move. Keep latest widths in a ref.
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

  // Resize a boundary between two fixed-width columns by redistributing space
  // between them. This makes the divider feel like it affects the immediate area
  // (the two adjacent columns), not some unrelated padding.
  const handleResizeBetween = useCallback(
    (left: Exclude<ColumnKey, "padding">, right: Exclude<ColumnKey, "padding">) =>
      (delta: number) => {
        const minWidth = 60
        const leftCurrent = columnWidthsRef.current[left]
        const rightCurrent = columnWidthsRef.current[right]

        // Positive delta => move divider right: left grows, right shrinks.
        // Negative delta => move divider left: left shrinks, right grows.
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

  const showFileSizes = displaySettings?.showFileSizes ?? true
  const showFileDates = displaySettings?.showFileDates ?? true

  // Match the icon slot width to FileRow's icon size so name column text starts at the same x.
  const thumbnailSize = displaySettings?.thumbnailSize ?? "medium"
  const iconSizeMap: Record<string, number> = { small: 14, medium: 18, large: 22 }
  const iconSlotWidth = iconSizeMap[thumbnailSize] ?? 18

  const effectiveSortConfig = sortConfig ?? { field: "name", direction: "asc" }
  const effectiveOnSort = onSort ?? (() => {})

  return (
    <div
      className={cn(
        "group relative flex h-8 items-center gap-2 border-b border-border bg-muted/50 px-3 text-xs font-medium text-muted-foreground select-none",
        className,
      )}
    >
      {/* Icon placeholder to match FileRow's icon slot */}
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
          {/* Divider between Size and Date: redistribute width between Size and Date */}
          <ResizeHandle
            onResize={
              showFileDates
                ? handleResizeBetween("size", "date")
                : // If Date column is hidden, this divider borders the trailing padding area.
                  handleResize("size")
            }
          />
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
          {/* Divider at the end of Date column: resize Date column */}
          <ResizeHandle onResize={handleResize("date")} />
        </div>
      )}
      {/* Padding column */}
      <div className="shrink-0" style={{ width: columnWidths.padding }} />

      {/*
        Right-side padding (indent) resizer.
        This handle affects only `columnWidths.padding` (space after the last column)
        and does not change any other column widths.
      */}
      <ResizeHandle onResize={handleResize("padding")} />
    </div>
  )
}
