import { memo, useCallback, useEffect, useRef, useState } from "react"
import type { FileEntry } from "@/shared/api/tauri"
import { cn, formatBytes, formatDate } from "@/shared/lib"
import { FileIcon } from "./FileIcon"
import { FileRowActions } from "./FileRowActions"

interface FileRowProps {
  file: FileEntry
  isSelected: boolean
  isFocused?: boolean
  isCut?: boolean
  isBookmarked?: boolean
  onSelect: (e: React.MouseEvent) => void
  onOpen: () => void
  onDrop?: (sources: string[], destination: string) => void
  getSelectedPaths?: () => string[]
  onCopy?: () => void
  onCut?: () => void
  onRename?: () => void
  onDelete?: () => void
  onQuickLook?: () => void
  onToggleBookmark?: () => void
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
    isCut = false,
    isBookmarked = false,
    onSelect,
    onOpen,
    onDrop,
    getSelectedPaths,
    onCopy,
    onCut,
    onRename,
    onDelete,
    onQuickLook,
    onToggleBookmark,
    columnWidths = { size: 100, date: 150, padding: 16 },
  }: FileRowProps) {
    const rowRef = useRef<HTMLDivElement>(null)
    const [isDragOver, setIsDragOver] = useState(false)

    // Scroll into view when focused
    useEffect(() => {
      if (isFocused && rowRef.current) {
        rowRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" })
      }
    }, [isFocused])

    const handleDragOver = useCallback(
      (e: React.DragEvent) => {
        if (!file.is_dir) return
        e.preventDefault()
        e.stopPropagation()
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
        e.stopPropagation()
        setIsDragOver(false)

        if (!file.is_dir || !onDrop) return

        try {
          const data = e.dataTransfer.getData("application/json")
          if (data) {
            const parsed = JSON.parse(data)
            if (parsed.paths && Array.isArray(parsed.paths)) {
              // Don't drop onto self
              if (parsed.paths.includes(file.path)) return
              onDrop(parsed.paths, file.path)
            }
          }
        } catch {
          // Ignore parse errors
        }
      },
      [file.is_dir, file.path, onDrop],
    )

    const handleDragStart = useCallback(
      (e: React.DragEvent) => {
        const paths = getSelectedPaths?.() ?? [file.path]
        e.dataTransfer.setData(
          "application/json",
          JSON.stringify({ paths, action: e.ctrlKey ? "copy" : "move" }),
        )
        e.dataTransfer.effectAllowed = "copyMove"
      },
      [file.path, getSelectedPaths],
    )

    const handleContextMenu = useCallback(
      (e: React.MouseEvent) => {
        // Select item on right-click so context menu actions apply to it
        // Do not prevent default — allow the context menu trigger to handle opening
        onSelect(e as unknown as React.MouseEvent)
      },
      [onSelect],
    )

    const handleDoubleClick = useCallback(() => {
      onOpen()
    }, [onOpen])

    return (
      <div
        ref={rowRef}
        className={cn(
          "group flex items-center h-8 px-2 cursor-pointer border-b border-border/50",
          "hover:bg-accent/50 transition-colors",
          isSelected && "bg-accent",
          isFocused && "ring-1 ring-inset ring-primary",
          isDragOver && file.is_dir && "bg-primary/20 ring-2 ring-primary",
          isCut && "opacity-50",
        )}
        onClick={onSelect}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onDragStart={handleDragStart}
        draggable
        data-path={file.path}
      >
        {/* Icon */}
        <FileIcon extension={file.extension} isDir={file.is_dir} className="w-4.5 h-4.5 mr-3" />

        {/* Name */}
        <span className={cn("flex-1 truncate text-sm", isCut && "text-muted-foreground")}>
          {file.name}
        </span>

        {/* Hover Actions */}
        <FileRowActions
          isDir={file.is_dir}
          isBookmarked={isBookmarked}
          onOpen={onOpen}
          onCopy={onCopy ?? (() => {})}
          onCut={onCut ?? (() => {})}
          onRename={onRename ?? (() => {})}
          onDelete={onDelete ?? (() => {})}
          onQuickLook={onQuickLook}
          onToggleBookmark={onToggleBookmark}
          className="opacity-0 group-hover:opacity-100"
        />

        {/* Size */}
        <span
          className="text-sm text-muted-foreground text-right"
          style={{ width: columnWidths.size }}
        >
          {file.is_dir ? "—" : formatBytes(file.size)}
        </span>

        {/* Date */}
        <span
          className="text-sm text-muted-foreground text-right"
          style={{ width: columnWidths.date }}
        >
          {formatDate(file.modified)}
        </span>

        {/* Padding for scrollbar */}
        <div style={{ width: columnWidths.padding }} />
      </div>
    )
  },
  (prevProps, nextProps) => {
    // Custom comparison - rerender only when these props change
    return (
      prevProps.file.path === nextProps.file.path &&
      prevProps.file.name === nextProps.file.name &&
      prevProps.file.size === nextProps.file.size &&
      prevProps.file.modified === nextProps.file.modified &&
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.isFocused === nextProps.isFocused &&
      prevProps.isCut === nextProps.isCut &&
      prevProps.isBookmarked === nextProps.isBookmarked &&
      prevProps.columnWidths?.size === nextProps.columnWidths?.size &&
      prevProps.columnWidths?.date === nextProps.columnWidths?.date
    )
  },
)
