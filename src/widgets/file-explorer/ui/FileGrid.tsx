import { useVirtualizer } from "@tanstack/react-virtual"
import { Eye } from "lucide-react"
import { memo, useCallback, useMemo, useRef, useState } from "react"
import { FileIcon, FileThumbnail } from "@/entities/file-entry"
import { useClipboardStore } from "@/features/clipboard"
import { useViewModeStore } from "@/features/view-mode"
import type { FileEntry } from "@/shared/api/tauri"
import { cn, formatBytes } from "@/shared/lib"
import { createDragData, parseDragData } from "@/shared/lib/drag-drop"

interface FileGridProps {
  files: FileEntry[]
  selectedPaths: Set<string>
  onSelect: (path: string, e: React.MouseEvent) => void
  onOpen: (path: string, isDir: boolean) => void
  onDrop?: (sources: string[], destination: string) => void
  onQuickLook?: (file: FileEntry) => void
  className?: string
}

export const FileGrid = memo(function FileGrid({
  files,
  selectedPaths,
  onSelect,
  onOpen,
  onDrop,
  onQuickLook,
  className,
}: FileGridProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  const { settings } = useViewModeStore()
  const clipboardPaths = useClipboardStore((s) => s.paths)
  const clipboardAction = useClipboardStore((s) => s.action)

  // Grid configuration based on size
  const gridConfig = useMemo(() => {
    switch (settings.gridSize) {
      case "small":
        return { columns: 8, iconSize: 48, itemHeight: 100, itemWidth: 100, showThumbnail: false }
      case "large":
        return { columns: 4, iconSize: 96, itemHeight: 160, itemWidth: 180, showThumbnail: true }
      default: // medium
        return { columns: 6, iconSize: 64, itemHeight: 120, itemWidth: 140, showThumbnail: true }
    }
  }, [settings.gridSize])

  // Calculate actual columns based on container width
  const columnCount = gridConfig.columns
  const rowCount = Math.ceil(files.length / columnCount)

  // Virtual row renderer
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => gridConfig.itemHeight + 8,
    overscan: 3,
  })

  // Memoized handlers
  const handleDragStart = useCallback(
    (e: React.DragEvent, file: FileEntry) => {
      const paths = selectedPaths.has(file.path) ? [...selectedPaths] : [file.path]
      e.dataTransfer.setData("application/json", createDragData(paths))
      e.dataTransfer.effectAllowed = "copyMove"
    },
    [selectedPaths],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent, targetPath: string) => {
      e.preventDefault()
      const data = parseDragData(e.dataTransfer)
      if (data && onDrop) {
        onDrop(data.paths, targetPath)
      }
    },
    [onDrop],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }, [])

  // Check if file is cut
  const isCut = useCallback(
    (path: string) => clipboardAction === "cut" && clipboardPaths.includes(path),
    [clipboardAction, clipboardPaths],
  )

  return (
    <div ref={parentRef} className={cn("h-full overflow-auto p-2", className)}>
      <div className="relative w-full" style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
        {rowVirtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.key}
            className="absolute top-0 left-0 w-full flex gap-2"
            style={{
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            {Array.from({ length: columnCount }).map((_, colIndex) => {
              const fileIndex = virtualRow.index * columnCount + colIndex
              const file = files[fileIndex]
              if (!file)
                return (
                  <div
                    key={`placeholder-${virtualRow.index}-${colIndex}`}
                    style={{ width: gridConfig.itemWidth }}
                  />
                )

              return (
                <div key={file.path} style={{ width: gridConfig.itemWidth }}>
                  <GridItem
                    file={file}
                    isSelected={selectedPaths.has(file.path)}
                    isCut={isCut(file.path)}
                    iconSize={gridConfig.iconSize}
                    itemHeight={gridConfig.itemHeight}
                    showThumbnail={gridConfig.showThumbnail}
                    onSelect={(e) => onSelect(file.path, e)}
                    onOpen={() => onOpen(file.path, file.is_dir)}
                    onQuickLook={onQuickLook ? () => onQuickLook(file) : undefined}
                    onDragStart={(e) => handleDragStart(e, file)}
                    onDrop={(e) => handleDrop(e, file.path)}
                    onDragOver={handleDragOver}
                  />
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
})

interface GridItemProps {
  file: FileEntry
  isSelected: boolean
  isCut: boolean
  iconSize: number
  itemHeight: number
  showThumbnail: boolean
  onSelect: (e: React.MouseEvent) => void
  onOpen: () => void
  onQuickLook?: () => void
  onDragStart: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
}
const GridItem = memo(function GridItem({
  file,
  isSelected,
  isCut,
  iconSize,
  itemHeight,
  showThumbnail,
  onSelect,
  onOpen,
  onQuickLook,
  onDragStart,
  onDrop,
  onDragOver,
}: GridItemProps) {
  const [isDragOver, setIsDragOver] = useState(false)

  return (
    <div
      className={cn(
        "group flex flex-col items-center justify-center p-2 rounded-lg cursor-default select-none",
        "hover:bg-accent/50 transition-colors relative",
        isSelected && "bg-accent",
        isCut && "opacity-50",
        isDragOver && file.is_dir && "ring-2 ring-primary bg-accent",
      )}
      style={{ height: itemHeight }}
      onClick={onSelect}
      onDoubleClick={onOpen}
      onDragStart={onDragStart}
      onDrop={(e) => {
        setIsDragOver(false)
        onDrop(e)
      }}
      onDragOver={(e) => {
        if (file.is_dir) setIsDragOver(true)
        onDragOver(e)
      }}
      onDragLeave={() => setIsDragOver(false)}
      draggable
      data-path={file.path}
    >
      {/* Quick Look button on hover */}
      {onQuickLook && !file.is_dir && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onQuickLook()
          }}
          className={cn(
            "absolute top-1 right-1 p-1 rounded bg-background/80 backdrop-blur-sm",
            "opacity-0 group-hover:opacity-100 transition-opacity",
            "hover:bg-background",
          )}
          title="Быстрый просмотр"
        >
          <Eye className="h-4 w-4" />
        </button>
      )}

      {showThumbnail ? (
        <FileThumbnail
          path={file.path}
          extension={file.extension}
          isDir={file.is_dir}
          size={iconSize}
          className={cn("mb-1", isCut && "opacity-70")}
        />
      ) : (
        <FileIcon
          extension={file.extension}
          isDir={file.is_dir}
          size={iconSize}
          className={cn("mb-1", isCut && "opacity-70")}
        />
      )}

      <span
        className={cn("text-xs text-center truncate w-full px-1", isCut && "italic")}
        title={file.name}
      >
        {file.name}
      </span>
      {!file.is_dir && (
        <span className="text-xs text-muted-foreground">{formatBytes(file.size)}</span>
      )}
    </div>
  )
})
