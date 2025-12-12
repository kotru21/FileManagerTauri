import { useVirtualizer } from "@tanstack/react-virtual"
import type React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import type { FileEntry } from "@/entities/file-entry"
import { FileCard } from "@/entities/file-entry"
import { VIRTUALIZATION } from "@/shared/config"
import { cn } from "@/shared/lib"

interface GridFileListProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> {
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
  ...rest
}: GridFileListProps) {
  const parentRef = useRef<HTMLDivElement | null>(null)
  const [cols, setCols] = useState(2)

  useEffect(() => {
    const el = parentRef.current
    if (!el) return

    const observer = new ResizeObserver(() => {
      const w = el.clientWidth
      // Tailwind breakpoints: sm >= 640px, md >= 768px
      if (w >= 768) setCols(6)
      else if (w >= 640) setCols(3)
      else setCols(2)
    })
    observer.observe(el)
    // run once
    const w = el.clientWidth
    if (w >= 768) setCols(6)
    else if (w >= 640) setCols(3)
    else setCols(2)
    return () => observer.disconnect()
  }, [])

  const rowCount = useMemo(() => Math.ceil(files.length / cols), [files.length, cols])

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => VIRTUALIZATION.ROW_HEIGHT * 4, // heuristic for grid row height
    overscan: VIRTUALIZATION.OVERSCAN,
  })

  if (files.length === 0) {
    return (
      <div
        className={cn("flex items-center justify-center h-full text-muted-foreground", className)}
        onContextMenu={() => onEmptyContextMenu?.()}
      >
        Папка пуста
      </div>
    )
  }

  return (
    <div
      ref={parentRef}
      role="listbox"
      aria-label="Список файлов"
      aria-multiselectable="true"
      className={cn("flex-1 overflow-auto h-full", className)}
      {...rest}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((row) => {
          const start = row.index * cols
          const end = Math.min(start + cols, files.length)
          const items = files.slice(start, end)
          return (
            <div
              key={row.index}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${row.start}px)`,
                height: `${row.size}px`,
              }}
            >
              <div
                className="p-3"
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                  gap: 8,
                }}
              >
                {items.map((file) => (
                  <div key={file.path}>
                    <FileCard
                      file={file}
                      isSelected={selectedPaths.has(file.path)}
                      onSelect={(e) => onSelect(file.path, e)}
                      onOpen={() => onOpen(file.path, file.is_dir)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default GridFileList
