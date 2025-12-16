import { memo, useCallback } from "react"
import { FileIcon } from "@/entities/file-entry"
import { useClipboardStore } from "@/features/clipboard"
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

export const FileGrid = memo(function FileGrid({
  files,
  selectedPaths,
  onSelect,
  onOpen,
  onDrop,
  className,
}: FileGridProps) {
  const { settings } = useViewModeStore()

  // Get clipboard state for cut indication
  const clipboardPaths = useClipboardStore((s) => s.paths)
  const isCutAction = useClipboardStore((s) => s.isCut())

  const gridSizeConfig = {
    small: { cols: "grid-cols-[repeat(auto-fill,minmax(80px,1fr))]", iconSize: 32, itemHeight: 80 },
    medium: {
      cols: "grid-cols-[repeat(auto-fill,minmax(100px,1fr))]",
      iconSize: 48,
      itemHeight: 100,
    },
    large: {
      cols: "grid-cols-[repeat(auto-fill,minmax(120px,1fr))]",
      iconSize: 64,
      itemHeight: 120,
    },
  }

  const config = gridSizeConfig[settings.gridSize]

  const handleDragStart = useCallback(
    (e: React.DragEvent, file: FileEntry) => {
      const paths = selectedPaths.has(file.path) ? Array.from(selectedPaths) : [file.path]
      e.dataTransfer.setData("application/json", JSON.stringify({ paths, action: "move" }))
      e.dataTransfer.effectAllowed = "copyMove"
    },
    [selectedPaths],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent, targetPath: string) => {
      e.preventDefault()
      const data = e.dataTransfer.getData("application/json")
      if (!data || !onDrop) return

      try {
        const { paths } = JSON.parse(data) as { paths: string[] }
        if (paths.includes(targetPath)) return
        onDrop(paths, targetPath)
      } catch {
        // Ignore parse errors
      }
    },
    [onDrop],
  )

  return (
    <div className={cn("grid gap-2 p-2", config.cols, className)}>
      {files.map((file) => {
        const isCut = isCutAction && clipboardPaths.includes(file.path)

        return (
          <GridItem
            key={file.path}
            file={file}
            isSelected={selectedPaths.has(file.path)}
            isCut={isCut}
            iconSize={config.iconSize}
            itemHeight={config.itemHeight}
            onSelect={(e) => onSelect(file.path, e)}
            onOpen={() => onOpen(file.path, file.is_dir)}
            onDragStart={(e) => handleDragStart(e, file)}
            onDrop={(e) => handleDrop(e, file.path)}
            onDragOver={(e) => {
              if (file.is_dir) {
                e.preventDefault()
                e.dataTransfer.dropEffect = e.ctrlKey ? "copy" : "move"
              }
            }}
          />
        )
      })}
    </div>
  )
})

interface GridItemProps {
  file: FileEntry
  isSelected: boolean
  isCut: boolean
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
  isCut,
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
      className={cn(
        "flex flex-col items-center justify-center p-2 rounded-lg cursor-default select-none",
        "hover:bg-accent/50 transition-colors",
        isSelected && "bg-accent",
        isCut && "opacity-50",
      )}
      style={{ height: itemHeight }}
      onClick={onSelect}
      onDoubleClick={onOpen}
      onDragStart={onDragStart}
      onDrop={onDrop}
      onDragOver={onDragOver}
      draggable
    >
      <FileIcon
        extension={file.extension}
        isDir={file.is_dir}
        size={iconSize}
        className={cn("mb-1", isCut && "opacity-70")}
      />
      <span
        className={cn("text-xs text-center truncate w-full", isCut && "italic")}
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
