import { useVirtualizer } from "@tanstack/react-virtual"
import { useCallback, useEffect, useRef, useState } from "react"
import type { FileEntry } from "@/entities/file-entry"
import { FileCard } from "@/entities/file-entry"
import { VIRTUALIZATION } from "@/shared/config"
import { cn } from "@/shared/lib"

interface GridFileListProps {
  files: FileEntry[]
  selectedPaths: Set<string>
  onSelect: (path: string, e: React.MouseEvent) => void
  onOpen: (path: string, isDir: boolean) => void
  onEmptyContextMenu?: () => void
  className?: string
}

export function GridFileList({
  files,
  selectedPaths,
  onSelect,
  onOpen,
  onEmptyContextMenu,
  className,
}: GridFileListProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [columns, setColumns] = useState(1)
  const [minColWidth] = useState(140) // matches CSS minmax(140px, 1fr)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const width = el.clientWidth
      const cols = Math.max(1, Math.floor(width / minColWidth))
      setColumns(cols)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [minColWidth])

  // Clear handler caches when files change
  useEffect(() => {
    selectHandlerCache.current.clear()
    openHandlerCache.current.clear()
    return () => {
      selectHandlerCache.current.clear()
      openHandlerCache.current.clear()
    }
  }, [])

  // Virtualize rows - each row contains `columns` items
  const rows = Math.max(1, Math.ceil(files.length / columns))
  const rowVirtualizer = useVirtualizer({
    count: rows,
    getScrollElement: () => containerRef.current,
    estimateSize: () => VIRTUALIZATION.GRID_ITEM_HEIGHT,
    overscan: VIRTUALIZATION.OVERSCAN,
  })

  const handleContainerClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest("[data-file-card]")) {
        onEmptyContextMenu?.()
      }
    },
    [onEmptyContextMenu],
  )

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest("[data-file-card]") && onEmptyContextMenu) {
        onEmptyContextMenu()
      }
    },
    [onEmptyContextMenu],
  )
  // Cache handlers to prevent creating closures inside map
  const selectHandlerCache = useRef<Map<string, (e: React.MouseEvent) => void>>(new Map())
  const openHandlerCache = useRef<Map<string, () => void>>(new Map())
  const getSelectHandler = useCallback(
    (path: string) => {
      const cached = selectHandlerCache.current.get(path)
      if (cached) return cached
      const handler = (e: React.MouseEvent) => onSelect(path, e)
      selectHandlerCache.current.set(path, handler)
      return handler
    },
    [onSelect],
  )
  const getOpenHandler = useCallback(
    (path: string, isDir: boolean) => {
      const cached = openHandlerCache.current.get(path)
      if (cached) return cached
      const handler = () => onOpen(path, isDir)
      openHandlerCache.current.set(path, handler)
      return handler
    },
    [onOpen],
  )
  // Remove debug log in production code

  if (files.length === 0) {
    return (
      <div className={cn("flex items-center justify-center h-full", className)}>
        <div className="text-muted-foreground">Папка пуста</div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn("h-full w-full overflow-auto p-4", className)}
      onClick={handleContainerClick}
      onContextMenu={handleContextMenu}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const rowIndex = virtualRow.index
          const start = rowIndex * columns
          return (
            <div
              key={rowIndex}
              data-row
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
                display: "flex",
                gap: "16px",
                paddingInline: "4px",
                alignItems: "flex-start",
              }}
            >
              {new Array(columns).fill(null).map((_, colIndex) => {
                const fileIndex = start + colIndex
                if (fileIndex >= files.length)
                  return <div key={`e-${fileIndex}`} style={{ flex: 1 }} />
                const file = files[fileIndex]
                return (
                  <div key={file.path} data-file-card style={{ flex: 1 }}>
                    <FileCard
                      file={file}
                      isSelected={selectedPaths.has(file.path)}
                      onSelect={getSelectHandler(file.path)}
                      onOpen={getOpenHandler(file.path, file.is_dir)}
                    />
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
