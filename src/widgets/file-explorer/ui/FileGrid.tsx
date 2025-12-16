import { memo, useCallback } from "react"
import { FileIcon } from "@/entities/file-entry"
import { useViewModeStore } from "@/features/view-mode"
import type { FileEntry } from "@/shared/api/tauri"
import { cn, formatBytes } from "@/shared/lib"

interface FileGridProps {
  files: FileEntry[]
  selectedPaths: Set<string>
  onSelect: (path: string, e: React.MouseEvent) => void
  onOpen: (path: string, isDir: boolean) => void
  onDrop?: (sources: string[], destination: string) => void
  className?: string
}

const GRID_SIZES = {
  small: { width: 80, height: 90, iconSize: 32 },
  medium: { width: 110, height: 120, iconSize: 48 },
  large: { width: 150, height: 160, iconSize: 64 },
}

export const FileGrid = memo(function FileGrid({
  files,
  selectedPaths,
  onSelect,
  onOpen,
  onDrop,
  className,
}: FileGridProps) {
  const { settings } = useViewModeStore()
  const gridSize = GRID_SIZES[settings.gridSize]

  const handleDragStart = useCallback(
    (e: React.DragEvent, file: FileEntry) => {
      const paths = selectedPaths.has(file.path) ? Array.from(selectedPaths) : [file.path]

      e.dataTransfer.setData("application/json", JSON.stringify({ paths }))
      e.dataTransfer.effectAllowed = "copyMove"
    },
    [selectedPaths],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent, file: FileEntry) => {
      if (!file.is_dir || !onDrop) return

      e.preventDefault()
      try {
        const data = JSON.parse(e.dataTransfer.getData("application/json"))
        if (data.paths && !data.paths.includes(file.path)) {
          onDrop(data.paths, file.path)
        }
      } catch {
        // Ignore parse errors
      }
    },
    [onDrop],
  )

  const handleDragOver = useCallback((e: React.DragEvent, file: FileEntry) => {
    if (file.is_dir) {
      e.preventDefault()
      e.dataTransfer.dropEffect = e.ctrlKey ? "copy" : "move"
    }
  }, [])

  return (
    <div
      className={cn("grid gap-2 p-4", className)}
      style={{
        gridTemplateColumns: `repeat(auto-fill, minmax(${gridSize.width}px, 1fr))`,
      }}
    >
      {files.map((file) => (
        <GridItem
          key={file.path}
          file={file}
          isSelected={selectedPaths.has(file.path)}
          iconSize={gridSize.iconSize}
          itemHeight={gridSize.height}
          onSelect={(e) => onSelect(file.path, e)}
          onOpen={() => onOpen(file.path, file.is_dir)}
          onDragStart={(e) => handleDragStart(e, file)}
          onDrop={(e) => handleDrop(e, file)}
          onDragOver={(e) => handleDragOver(e, file)}
        />
      ))}
    </div>
  )
})

interface GridItemProps {
  file: FileEntry
  isSelected: boolean
  iconSize: number
  itemHeight: number
  onSelect: (e: React.MouseEvent) => void
  onOpen: () => void
  onDragStart: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
}

const GridItem = memo(function GridItem({
  file,
  isSelected,
  iconSize,
  itemHeight,
  onSelect,
  onOpen,
  onDragStart,
  onDrop,
  onDragOver,
}: GridItemProps) {
  return (
    <div
      draggable
      onClick={onSelect}
      onDoubleClick={onOpen}
      onDragStart={onDragStart}
      onDrop={onDrop}
      onDragOver={onDragOver}
      className={cn(
        "flex flex-col items-center justify-center rounded-lg p-2 cursor-pointer transition-colors",
        "hover:bg-accent/50",
        isSelected && "bg-accent ring-1 ring-primary",
      )}
      style={{ height: itemHeight }}
    >
      <FileIcon extension={file.extension} isDir={file.is_dir} size={iconSize} className="mb-2" />
      <span className="text-xs text-center line-clamp-2 break-all w-full" title={file.name}>
        {file.name}
      </span>
      {!file.is_dir && (
        <span className="text-[10px] text-muted-foreground mt-0.5">{formatBytes(file.size)}</span>
      )}
    </div>
  )
})
