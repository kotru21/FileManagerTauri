import { memo, useCallback, useEffect, useRef, useState } from "react"
import { useClipboardStore } from "@/features/clipboard"
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
    isFocused,
    onSelect,
    onOpen,
    onDrop,
    getSelectedPaths,
    columnWidths = { size: 100, date: 150, padding: 20 },
  }: FileRowProps) {
    const rowRef = useRef<HTMLDivElement>(null)
    const [isDragOver, setIsDragOver] = useState(false)

    // Check if file is cut
    const clipboardPaths = useClipboardStore((s) => s.paths)
    const isCutAction = useClipboardStore((s) => s.isCut())
    const isCut = isCutAction && clipboardPaths.includes(file.path)

    // Scroll into view when focused
    useEffect(() => {
      if (isFocused && rowRef.current) {
        rowRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" })
      }
    }, [isFocused])

    const handleDragStart = useCallback(
      (e: React.DragEvent) => {
        const paths = getSelectedPaths?.() || [file.path]
        if (!paths.includes(file.path)) {
          paths.push(file.path)
        }
        e.dataTransfer.setData("application/json", JSON.stringify({ paths, action: "move" }))
        e.dataTransfer.effectAllowed = "copyMove"
      },
      [file.path, getSelectedPaths],
    )

    const handleDragOver = useCallback(
      (e: React.DragEvent) => {
        if (!file.is_dir) return
        e.preventDefault()
        e.dataTransfer.dropEffect = e.ctrlKey ? "copy" : "move"
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

        // Don't drop onto self
        const data = e.dataTransfer.getData("application/json")
        if (!data) return

        try {
          const { paths } = JSON.parse(data) as { paths: string[] }
          if (paths.includes(file.path)) return
          onDrop(paths, file.path)
        } catch {
          // Ignore parse errors
        }
      },
      [file.is_dir, file.path, onDrop],
    )

    return (
      <div
        ref={rowRef}
        className={cn(
          "flex items-center h-7 px-2 text-sm cursor-default select-none",
          "border-b border-transparent",
          "hover:bg-accent/50 transition-colors",
          isSelected && "bg-accent",
          isFocused && "ring-1 ring-inset ring-ring",
          isDragOver && file.is_dir && "bg-accent ring-2 ring-primary",
          isCut && "opacity-50",
        )}
        onClick={onSelect}
        onDoubleClick={onOpen}
        onContextMenu={(e) => {
          // Select item on right-click so context menu actions apply to it
          // Do not prevent default — allow the context menu trigger to handle opening
          onSelect(e as unknown as React.MouseEvent)
        }}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        draggable
        data-path={file.path}
        data-is-dir={file.is_dir}
      >
        {/* Icon */}
        <FileIcon
          extension={file.extension}
          isDir={file.is_dir}
          className={cn("mr-3 shrink-0", isCut && "opacity-70")}
          size={18}
        />

        {/* Name */}
        <span className={cn("flex-1 truncate", isCut && "italic")}>{file.name}</span>

        {/* Size */}
        <span
          className="text-muted-foreground text-right shrink-0"
          style={{ width: columnWidths.size }}
        >
          {file.is_dir ? "" : formatBytes(file.size)}
        </span>

        {/* Date */}
        <span
          className="text-muted-foreground text-right shrink-0 ml-4"
          style={{ width: columnWidths.date }}
        >
          {formatDate(file.modified)}
        </span>

        {/* Padding for scrollbar */}
        <span style={{ width: columnWidths.padding }} className="shrink-0" />
      </div>
    )
  },
  // Custom comparison - rerender only when these props change
  (prev, next) =>
    prev.file.path === next.file.path &&
    prev.file.name === next.file.name &&
    prev.file.size === next.file.size &&
    prev.file.modified === next.file.modified &&
    prev.isSelected === next.isSelected &&
    prev.isFocused === next.isFocused &&
    prev.columnWidths?.size === next.columnWidths?.size &&
    prev.columnWidths?.date === next.columnWidths?.date,
)
