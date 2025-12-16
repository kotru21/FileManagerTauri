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

function FileRowComponent({
  file,
  isSelected,
  isFocused,
  isCut,
  isBookmarked,
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
  columnWidths,
}: FileRowProps) {
  const rowRef = useRef<HTMLDivElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  // Scroll into view when focused
  useEffect(() => {
    if (isFocused && rowRef.current) {
      rowRef.current.scrollIntoView({ block: "nearest" })
    }
  }, [isFocused])

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      if (!file.is_dir) return
      e.preventDefault()
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

      const paths = getSelectedPaths?.() ?? []
      if (paths.includes(file.path)) return

      try {
        const data = e.dataTransfer.getData("application/json")
        if (data) {
          const parsed = JSON.parse(data)
          onDrop(parsed.paths || paths, file.path)
        } else {
          onDrop(paths, file.path)
        }
      } catch {
        onDrop(paths, file.path)
      }
    },
    [file.is_dir, file.path, onDrop, getSelectedPaths],
  )

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      const paths = getSelectedPaths?.() ?? [file.path]
      const dragPaths = paths.includes(file.path) ? paths : [file.path]
      e.dataTransfer.setData("application/json", JSON.stringify({ paths: dragPaths }))
      e.dataTransfer.effectAllowed = "copyMove"
    },
    [file.path, getSelectedPaths],
  )

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (!isSelected) {
        onSelect(e)
      }
    },
    [isSelected, onSelect],
  )

  return (
    <div
      ref={rowRef}
      data-path={file.path}
      className={cn(
        "group flex items-center h-8 px-2 cursor-pointer select-none",
        "hover:bg-accent/50 transition-colors",
        isSelected && "bg-accent",
        isFocused && "ring-1 ring-primary ring-inset",
        isDragOver && "bg-accent/80",
        isCut && "opacity-50",
      )}
      onClick={onSelect}
      onDoubleClick={onOpen}
      onContextMenu={handleContextMenu}
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Icon */}
      <FileIcon
        extension={file.extension}
        isDir={file.is_dir}
        size={18}
        className="mr-3 shrink-0"
      />

      {/* Name */}
      <span className={cn("flex-1 min-w-0 truncate text-sm", isCut && "text-muted-foreground")}>
        {file.name}
      </span>

      {/* Hover Actions */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity mr-2">
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
        />
      </div>

      {/* Size */}
      <span
        className="text-sm text-muted-foreground text-right shrink-0"
        style={{ width: columnWidths?.size ?? 80 }}
      >
        {file.is_dir ? "--" : formatBytes(file.size)}
      </span>

      {/* Date */}
      <span
        className="text-sm text-muted-foreground text-right shrink-0 ml-4"
        style={{ width: columnWidths?.date ?? 140 }}
      >
        {formatDate(file.modified)}
      </span>

      {/* Padding for scrollbar */}
      <div style={{ width: columnWidths?.padding ?? 8 }} className="shrink-0" />
    </div>
  )
}

// Custom comparison - check all relevant props
function areEqual(prev: FileRowProps, next: FileRowProps): boolean {
  return (
    prev.file.path === next.file.path &&
    prev.file.name === next.file.name &&
    prev.file.size === next.file.size &&
    prev.file.modified === next.file.modified &&
    prev.isSelected === next.isSelected &&
    prev.isFocused === next.isFocused &&
    prev.isCut === next.isCut &&
    prev.isBookmarked === next.isBookmarked &&
    prev.columnWidths?.size === next.columnWidths?.size &&
    prev.columnWidths?.date === next.columnWidths?.date &&
    prev.columnWidths?.padding === next.columnWidths?.padding
  )
}

export const FileRow = memo(FileRowComponent, areEqual)
