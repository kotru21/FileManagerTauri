import { memo, useCallback, useEffect, useRef, useState } from "react"
import type { FileEntry } from "@/shared/api/tauri"
import { cn, formatBytes, formatDate } from "@/shared/lib"
import { FileIcon } from "./FileIcon"

interface FileRowProps {
  file: FileEntry
  isSelected: boolean
  isFocused?: boolean
  onSelect: (e: React.MouseEvent) => void
  onOpen: () => void
  onDrop?: (sources: string[], destination: string) => void
  getSelectedPaths?: () => string[]
  columnWidths?: {
    size: number
    date: number
    padding: number
  }
}

export const FileRow = memo(
  function FileRow({
    file,
    isSelected,
    isFocused = false,
    onSelect,
    onOpen,
    onDrop,
    getSelectedPaths,
    columnWidths = { size: 100, date: 150, padding: 16 },
  }: FileRowProps) {
    const [isDragOver, setIsDragOver] = useState(false)
    const rowRef = useRef<HTMLDivElement>(null)

    // Scroll into view when focused
    useEffect(() => {
      if (isFocused && rowRef.current) {
        rowRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" })
      }
    }, [isFocused])

    const handleDragStart = useCallback(
      (e: React.DragEvent) => {
        const paths = getSelectedPaths?.() ?? []
        if (!paths.includes(file.path)) {
          paths.push(file.path)
        }
        e.dataTransfer.setData("application/json", JSON.stringify(paths))
        e.dataTransfer.effectAllowed = "copyMove"
      },
      [file.path, getSelectedPaths],
    )

    const handleDragOver = useCallback(
      (e: React.DragEvent) => {
        if (!file.is_dir) return
        e.preventDefault()
        e.dataTransfer.dropEffect = "copy"
        setIsDragOver(true)
      },
      [file.is_dir],
    )

    const handleDragLeave = useCallback(() => {
      setIsDragOver(false)
    }, [])

    const handleDrop = useCallback(
      (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragOver(false)

        if (!file.is_dir || !onDrop) return

        try {
          const data = e.dataTransfer.getData("application/json")
          const sources: string[] = JSON.parse(data)

          // Don't drop onto self
          if (sources.includes(file.path)) return

          onDrop(sources, file.path)
        } catch {
          // Ignore parse errors
        }
      },
      [file.is_dir, file.path, onDrop],
    )

    const handleDoubleClick = useCallback(() => {
      onOpen()
    }, [onOpen])

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
          e.preventDefault()
          onOpen()
        }
      },
      [onOpen],
    )

    return (
      <div
        ref={rowRef}
        className={cn(
          "flex items-center h-7 px-2 cursor-pointer select-none",
          "hover:bg-accent/50 transition-colors duration-75",
          isSelected && "bg-accent text-accent-foreground",
          isFocused && "ring-1 ring-inset ring-primary",
          isDragOver && file.is_dir && "bg-primary/20 ring-2 ring-primary",
        )}
        onClick={onSelect}
        onContextMenu={(e) => {
          // Select item on right-click so context menu actions apply to it
          // Do not prevent default — allow the context menu trigger to handle opening
          onSelect(e as unknown as React.MouseEvent)
        }}
        onDoubleClick={handleDoubleClick}
        onKeyDown={handleKeyDown}
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        tabIndex={isFocused ? 0 : -1}
        role="row"
        aria-selected={isSelected}
      >
        <FileIcon
          extension={file.extension}
          isDir={file.is_dir}
          className="mr-3 shrink-0"
          size={18}
        />

        <span className="flex-1 truncate text-sm" title={file.name}>
          {file.name}
        </span>

        <span
          className="text-sm text-muted-foreground text-right shrink-0"
          style={{ width: columnWidths.size }}
        >
          {file.is_dir ? "" : formatBytes(file.size)}
        </span>

        <span
          className="text-sm text-muted-foreground text-right shrink-0"
          style={{ width: columnWidths.date }}
        >
          {formatDate(file.modified)}
        </span>

        <span style={{ width: columnWidths.padding }} />
      </div>
    )
  },
  // Custom comparison - rerender only when these props change
  (prevProps, nextProps) => {
    return (
      prevProps.file.path === nextProps.file.path &&
      prevProps.file.modified === nextProps.file.modified &&
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.isFocused === nextProps.isFocused &&
      prevProps.columnWidths?.size === nextProps.columnWidths?.size &&
      prevProps.columnWidths?.date === nextProps.columnWidths?.date &&
      prevProps.columnWidths?.padding === nextProps.columnWidths?.padding
    )
  },
)
