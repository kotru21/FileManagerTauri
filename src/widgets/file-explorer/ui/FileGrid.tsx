import { useVirtualizer } from "@tanstack/react-virtual"
import { Eye } from "lucide-react"
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { FileThumbnail } from "@/entities/file-entry"
import { useClipboardStore } from "@/features/clipboard"
import { useBehaviorSettings, useFileDisplaySettings, usePerformanceSettings } from "@/features/settings"
import type { FileEntry } from "@/shared/api/tauri"
import { cn } from "@/shared/lib"
import { parseDragData } from "@/shared/lib/drag-drop"

interface FileGridProps {
  files: FileEntry[]
  selectedPaths: Set<string>
  onSelect: (path: string, e: React.MouseEvent) => void
  onOpen: (path: string, isDir: boolean) => void
  onDrop?: (sources: string[], destination: string) => void
  onQuickLook?: (file: FileEntry) => void
  className?: string
}

// Grid configuration based on thumbnail size from settings
const GRID_CONFIGS = {
  small: { itemSize: 80, iconSize: 40, thumbnailSize: 60 },
  medium: { itemSize: 120, iconSize: 56, thumbnailSize: 96 },
  large: { itemSize: 160, iconSize: 72, thumbnailSize: 128 },
}

export function FileGrid({
  files,
  selectedPaths,
  onSelect,
  onOpen,
  onDrop,
  onQuickLook,
  className,
}: FileGridProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  // Get settings
  const displaySettings = useFileDisplaySettings()
  const behaviorSettings = useBehaviorSettings()
  const _performance = usePerformanceSettings()
  const { paths: cutPaths, isCut } = useClipboardStore()

  // Use thumbnail size from settings
  const gridConfig = GRID_CONFIGS[displaySettings.thumbnailSize]

  // Calculate actual columns based on container width
  const columns = useMemo(() => {
    if (containerWidth === 0) return 4
    return Math.max(1, Math.floor(containerWidth / gridConfig.itemSize))
  }, [containerWidth, gridConfig.itemSize])

  // Virtual row renderer
  const rowVirtualizer = useVirtualizer({
    count: Math.ceil(files.length / columns),
    getScrollElement: () => containerRef.current,
    estimateSize: () => gridConfig.itemSize + 40,
    overscan: 3,
  })

  // Handle click based on behavior settings
  const handleClick = useCallback(
    (file: FileEntry, e: React.MouseEvent) => {
      onSelect(file.path, e)
    },
    [onSelect],
  )

  const handleDoubleClick = useCallback(
    (file: FileEntry) => {
      if (behaviorSettings.doubleClickToOpen) {
        onOpen(file.path, file.is_dir)
      }
    },
    [behaviorSettings.doubleClickToOpen, onOpen],
  )

  // Check if file is cut
  const isFileCut = useCallback(
    (path: string) => isCut() && cutPaths.includes(path),
    [cutPaths, isCut],
  )

  // Observe container width
  useEffect(() => {
    if (!containerRef.current) return

    const observer = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width)
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={containerRef} className={cn("h-full overflow-auto p-2", className)}>
      <div className="relative w-full" style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const startIndex = virtualRow.index * columns
          const rowFiles = files.slice(startIndex, startIndex + columns)

          return (
            <div
              key={virtualRow.key}
              className="absolute left-0 right-0 flex gap-2"
              style={{ top: virtualRow.start, height: virtualRow.size }}
            >
              {rowFiles.map((file) => (
                <GridItem
                  key={file.path}
                  file={file}
                  isSelected={selectedPaths.has(file.path)}
                  isCut={isFileCut(file.path)}
                  gridConfig={gridConfig}
                  showFileExtensions={displaySettings.showFileExtensions}
                  onClick={(e) => handleClick(file, e)}
                  onDoubleClick={() => handleDoubleClick(file)}
                  onQuickLook={onQuickLook ? () => onQuickLook(file) : undefined}
                  onDrop={onDrop}
                />
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface GridItemProps {
  file: FileEntry
  isSelected: boolean
  isCut: boolean
  gridConfig: (typeof GRID_CONFIGS)[keyof typeof GRID_CONFIGS]
  showFileExtensions: boolean
  onClick: (e: React.MouseEvent) => void
  onDoubleClick: () => void
  onQuickLook?: () => void
  onDrop?: (sources: string[], destination: string) => void
}

const GridItem = memo(function GridItem({
  file,
  isSelected,
  isCut,
  gridConfig,
  showFileExtensions,
  onClick,
  onDoubleClick,
  onQuickLook,
  onDrop,
}: GridItemProps) {
  const [isDragOver, setIsDragOver] = useState(false)

  const displayName = showFileExtensions
    ? file.name
    : file.is_dir
      ? file.name
      : file.name.replace(/\.[^/.]+$/, "")

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      if (!file.is_dir) return
      e.preventDefault()
      setIsDragOver(true)
    },
    [file.is_dir],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      if (!file.is_dir || !onDrop) return

      const data = parseDragData(e.dataTransfer)
      if (data?.paths.length) {
        onDrop(data.paths, file.path)
      }
    },
    [file.is_dir, file.path, onDrop],
  )

  return (
    <div
      className={cn(
        "group relative flex flex-col items-center p-2 rounded-lg cursor-pointer",
        "hover:bg-accent/50 transition-colors",
        isSelected && "bg-accent",
        isDragOver && "bg-accent/70 ring-2 ring-primary",
        isCut && "opacity-50",
      )}
      style={{ width: gridConfig.itemSize }}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onDragOver={handleDragOver}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      data-path={file.path}
    >
      {/* Thumbnail or Icon */}
      <div
        className="relative flex items-center justify-center"
        style={{ width: gridConfig.thumbnailSize, height: gridConfig.thumbnailSize }}
      >
        <FileThumbnail
          path={file.path}
          extension={file.extension}
          isDir={file.is_dir}
          size={gridConfig.thumbnailSize}
          performanceSettings={{ lazyLoadImages: _performance.lazyLoadImages, thumbnailCacheSize: _performance.thumbnailCacheSize }}
        />

        {/* Quick Look button on hover */}
        {onQuickLook && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onQuickLook()
            }}
            className={cn(
              "absolute top-1 right-1 p-1 rounded bg-black/50 text-white",
              "opacity-0 group-hover:opacity-100 transition-opacity",
            )}
          >
            <Eye size={14} />
          </button>
        )}
      </div>

      {/* Name */}
      <span className="mt-1 text-xs text-center line-clamp-2 w-full">{displayName}</span>
    </div>
  )
})
