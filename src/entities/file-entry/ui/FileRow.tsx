import { memo, useCallback, useEffect, useRef, useState } from "react"
import type { FileEntry } from "@/shared/api/tauri"
import { cn, formatBytes, formatDate, formatRelativeDate, formatRelativeStrict } from "@/shared/lib"
import { getPerfLog, setPerfLog } from "@/shared/lib/devLogger"
import { FileIcon } from "./FileIcon"
import { FileRowActions } from "./FileRowActions"

// Minimal local types to avoid importing from higher layers
type FileDisplaySettings = {
  showFileExtensions: boolean
  showFileSizes: boolean
  showFileDates: boolean
  dateFormat: "relative" | "absolute" | "auto"
  thumbnailSize: "small" | "medium" | "large"
}

type AppearanceSettings = {
  reducedMotion?: boolean
}

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
  // New props: pass settings from higher layers (widgets/pages)
  displaySettings?: FileDisplaySettings
  appearance?: AppearanceSettings
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
  onQuickLook,
  onToggleBookmark,
  columnWidths = { size: 100, date: 180, padding: 8 },
  displaySettings: displaySettingsProp,
  appearance,
}: FileRowProps) {
  // Instrument render counts to help diagnose excessive re-renders in large directories
  try {
    const rc = (getPerfLog()?.renderCounts as Record<string, number>) ?? { fileRows: 0 }
    rc.fileRows = (rc.fileRows ?? 0) + 1
    setPerfLog({ renderCounts: rc })
  } catch {
    /* ignore */
  }
  const rowRef = useRef<HTMLDivElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  // Use passed display settings or sensible defaults to avoid depending on higher layers
  const defaultDisplaySettings: FileDisplaySettings = {
    showFileExtensions: true,
    showFileSizes: true,
    showFileDates: true,
    dateFormat: "relative",
    thumbnailSize: "medium",
  }
  const displaySettings = displaySettingsProp ?? defaultDisplaySettings

  // Map thumbnailSize setting to icon size for list mode
  const iconSizeMap: Record<string, number> = { small: 14, medium: 18, large: 22 }
  const iconSize = iconSizeMap[displaySettings.thumbnailSize] ?? 18

  const defaultAppearance: AppearanceSettings = { reducedMotion: false }
  const appearanceLocal = appearance ?? defaultAppearance

  // Scroll into view when focused; respect reduced motion setting
  useEffect(() => {
    if (isFocused && rowRef.current) {
      const behavior: ScrollBehavior = appearanceLocal.reducedMotion ? "auto" : "smooth"
      rowRef.current.scrollIntoView({ block: "nearest", behavior })
    }
  }, [isFocused, appearanceLocal.reducedMotion])

  // Format the display name based on settings
  const displayName = displaySettings.showFileExtensions
    ? file.name
    : file.is_dir
      ? file.name
      : file.name.replace(/\.[^/.]+$/, "")

  // Format date based on settings
  const formattedDate =
    displaySettings.dateFormat === "absolute"
      ? formatDate(file.modified)
      : displaySettings.dateFormat === "relative"
        ? formatRelativeStrict(file.modified)
        : // auto
          formatRelativeDate(file.modified)

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
      role="option"
      aria-selected={isSelected}
      aria-label={displayName}
      className={cn(
        "group flex items-center gap-2 px-3 py-1.5 cursor-pointer select-none no-drag",
        // Only show hover background when NOT selected so selection remains visually stable
        !isSelected && "hover:bg-accent/50 transition-colors duration-(--transition-duration)",
        isSelected && "bg-accent",
        isFocused && "ring-1 ring-primary ring-inset",
        isDragOver && "bg-accent/70 ring-2 ring-primary",
        isCut && "opacity-50",
      )}
      data-testid={`file-row-${encodeURIComponent(file.path)}`}
      onClick={onSelect}
      onContextMenu={onSelect}
      onDoubleClick={onOpen}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      draggable
      tabIndex={0}
      data-path={file.path}
    >
      <FileIcon
        extension={file.extension}
        isDir={file.is_dir}
        className="shrink-0"
        size={iconSize}
      />

      {/* Name cell: keep layout stable by rendering quick actions absolutely
          so fixed-width columns (size/date) always line up with the header. */}
      <div className="relative flex-1 min-w-0">
        <span
          className={cn(
            "block truncate text-sm file-name",
            // Reserve space so text doesn't sit under the action buttons when enabled
            onQuickLook && "pr-16",
          )}
        >
          {displayName}
        </span>

        {onQuickLook && (
          <div className="absolute right-0 top-1/2 -translate-y-1/2">
            <FileRowActions
              isDir={file.is_dir}
              isBookmarked={isBookmarked}
              onQuickLook={onQuickLook}
              onToggleBookmark={onToggleBookmark}
              className={cn(
                "no-drag",
                // show actions when hovered, focused, or selected; keep CSS hover fallback
                isHovered || isSelected || isFocused
                  ? "opacity-100"
                  : "opacity-0 group-hover:opacity-100",
              )}
            />
          </div>
        )}
      </div>

      {displaySettings.showFileSizes && (
        <span
          className="text-xs text-muted-foreground tabular-nums shrink-0 text-right pr-2"
          style={{ width: columnWidths.size }}
        >
          {file.is_dir ? "" : formatBytes(file.size)}
        </span>
      )}

      {displaySettings.showFileDates && (
        <span
          className="text-xs text-muted-foreground shrink-0 text-right pr-2"
          style={{ width: columnWidths.date }}
        >
          {formattedDate}
        </span>
      )}

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
    prev.columnWidths?.date === next.columnWidths?.date &&
    // Compare relevant settings to avoid needless re-renders when they change
    (prev.displaySettings?.thumbnailSize ?? "medium") ===
      (next.displaySettings?.thumbnailSize ?? "medium") &&
    (prev.displaySettings?.showFileExtensions ?? true) ===
      (next.displaySettings?.showFileExtensions ?? true) &&
    (prev.displaySettings?.showFileSizes ?? true) ===
      (next.displaySettings?.showFileSizes ?? true) &&
    (prev.displaySettings?.showFileDates ?? true) ===
      (next.displaySettings?.showFileDates ?? true) &&
    (prev.displaySettings?.dateFormat ?? "auto") === (next.displaySettings?.dateFormat ?? "auto") &&
    (prev.appearance?.reducedMotion ?? false) === (next.appearance?.reducedMotion ?? false)
  )
}
