import { memo, useCallback, useEffect, useRef, useState } from "react"
import { useFileDisplaySettings } from "@/features/settings"
import type { FileEntry } from "@/shared/api/tauri"
import { cn, formatBytes, formatDate, formatRelativeDate } from "@/shared/lib"
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

export const FileRow = memo(function FileRow({
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
  columnWidths = { size: 100, date: 180, padding: 8 },
}: FileRowProps) {
  // Instrument render counts to help diagnose excessive re-renders in large directories
  // Note: this is for debugging purposes — kept lightweight and safe in production.
  try {
    const rc = (globalThis as any).__fm_renderCounts || { fileRows: 0 }
    rc.fileRows = (rc.fileRows || 0) + 1
    ;(globalThis as any).__fm_renderCounts = rc
  } catch {
    /* ignore */
  }
  const rowRef = useRef<HTMLDivElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  // Get display settings
  const displaySettings = useFileDisplaySettings()

  // Map thumbnailSize setting to icon size for list mode
  const iconSizeMap: Record<string, number> = { small: 14, medium: 18, large: 22 }
  const iconSize = iconSizeMap[displaySettings.thumbnailSize] ?? 18

  // Scroll into view when focused
  useEffect(() => {
    if (isFocused && rowRef.current) {
      rowRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" })
    }
  }, [isFocused])

  // Format the display name based on settings
  const displayName = displaySettings.showFileExtensions
    ? file.name
    : file.is_dir
      ? file.name
      : file.name.replace(/\.[^/.]+$/, "")

  // Format date based on settings
  const formattedDate =
    displaySettings.dateFormat === "relative"
      ? formatRelativeDate(file.modified)
      : formatDate(file.modified)

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      const paths = getSelectedPaths?.() ?? [file.path]
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

      try {
        const data = JSON.parse(e.dataTransfer.getData("application/json"))
        if (data.paths?.length > 0) {
          onDrop(data.paths, file.path)
        }
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
        "group flex items-center gap-2 px-3 py-1.5 cursor-pointer select-none",
        "hover:bg-accent/50 transition-colors duration-[var(--transition-duration)]",
        isSelected && "bg-accent",
        isFocused && "ring-1 ring-primary ring-inset",
        isDragOver && "bg-accent/70 ring-2 ring-primary",
        isCut && "opacity-50",
      )}
      onClick={onSelect}
      onContextMenu={onSelect}
      onDoubleClick={onOpen}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      draggable
      data-path={file.path}
    >
      {/* Icon */}
      <FileIcon
        extension={file.extension}
        isDir={file.is_dir}
        className="shrink-0"
        size={iconSize}
      />

      {/* Name */}
      <span className="flex-1 truncate text-sm file-name">{displayName}</span>

      {/* Hover Actions */}
      {(onCopy || onCut || onRename || onDelete || onQuickLook) && (
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
      )}

      {/* Size */}
      {displaySettings.showFileSizes && (
        <span
          className="text-xs text-muted-foreground tabular-nums shrink-0 text-right"
          style={{ width: columnWidths.size }}
        >
          {file.is_dir ? "" : formatBytes(file.size)}
        </span>
      )}

      {/* Date */}
      {displaySettings.showFileDates && (
        <span
          className="text-xs text-muted-foreground shrink-0 text-right"
          style={{ width: columnWidths.date }}
        >
          {formattedDate}
        </span>
      )}

      {/* Padding for scrollbar */}
      <span className="shrink-0" style={{ width: columnWidths.padding }} />
    </div>
  )
}, arePropsEqual)

function arePropsEqual(prev: FileRowProps, next: FileRowProps): boolean {
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
    prev.columnWidths?.date === next.columnWidths?.date
  )
}
