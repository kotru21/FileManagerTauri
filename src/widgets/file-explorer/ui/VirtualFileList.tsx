import { useVirtualizer } from "@tanstack/react-virtual"
import { useCallback, useEffect, useMemo, useRef } from "react"
import { ColumnHeader, FileRow, InlineEditRow } from "@/entities/file-entry"
import { useInlineEditStore } from "@/features/inline-edit"
import { useKeyboardNavigation } from "@/features/keyboard-navigation"
import { useLayoutStore } from "@/features/layout"
import type { FileEntry } from "@/shared/api/tauri"
import { cn, getBasename } from "@/shared/lib"

interface VirtualFileListProps {
  files: FileEntry[]
  selectedPaths: Set<string>
  onSelect: (path: string, e: React.MouseEvent) => void
  onOpen: (path: string, isDir: boolean) => void
  onDrop?: (sources: string[], destination: string) => void
  getSelectedPaths?: () => string[]
  onCreateFolder?: (name: string) => void
  onCreateFile?: (name: string) => void
  onRename?: (oldPath: string, newName: string) => void
  className?: string
}

function findLastIndex<T>(arr: T[], predicate: (item: T) => boolean): number {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (predicate(arr[i])) return i
  }
  return -1
}

const ROW_HEIGHT = 32

export function VirtualFileList({
  files,
  selectedPaths,
  onSelect,
  onOpen,
  onDrop,
  getSelectedPaths,
  onCreateFolder,
  onCreateFile,
  onRename,
  className,
}: VirtualFileListProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  const { mode, targetPath, cancel, reset } = useInlineEditStore()
  const { layout, setColumnWidth } = useLayoutStore()

  const hasInlineEdit = mode !== null

  // Find index where inline edit row should appear
  const inlineEditIndex = useMemo(() => {
    if (mode === "rename" && targetPath) {
      return files.findIndex((f) => f.path === targetPath)
    }
    if (mode === "new-folder") {
      return 0
    }
    if (mode === "new-file") {
      const lastFolderIndex = findLastIndex(files, (f) => f.is_dir)
      return lastFolderIndex + 1
    }
    return -1
  }, [mode, targetPath, files])

  // Calculate total rows
  const totalRows = files.length + (hasInlineEdit ? 1 : 0)

  // Virtualizer
  const virtualizer = useVirtualizer({
    count: totalRows,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  })

  // Keyboard navigation
  const handleKeyboardSelect = useCallback(
    (path: string, e: { ctrlKey?: boolean; shiftKey?: boolean }) => {
      const syntheticEvent = {
        ctrlKey: e.ctrlKey || false,
        shiftKey: e.shiftKey || false,
        metaKey: false,
      } as React.MouseEvent
      onSelect(path, syntheticEvent)
    },
    [onSelect],
  )

  const { focusedIndex, setFocusedIndex } = useKeyboardNavigation({
    files,
    selectedPaths,
    onSelect: handleKeyboardSelect,
    onOpen,
    enabled: !hasInlineEdit,
  })

  // Scroll to inline edit row
  useEffect(() => {
    if (hasInlineEdit && inlineEditIndex >= 0) {
      virtualizer.scrollToIndex(inlineEditIndex, { align: "center" })
    }
  }, [hasInlineEdit, inlineEditIndex, virtualizer])

  // Memoize handlers
  const handleConfirm = useCallback(
    (name: string) => {
      if (mode === "new-folder" && onCreateFolder) {
        onCreateFolder(name)
      } else if (mode === "new-file" && onCreateFile) {
        onCreateFile(name)
      } else if (mode === "rename" && targetPath && onRename) {
        onRename(targetPath, name)
      }
      reset()
    },
    [mode, targetPath, onCreateFolder, onCreateFile, onRename, reset],
  )

  const handleColumnResize = useCallback(
    (column: "size" | "date" | "padding", width: number) => {
      setColumnWidth(column, width)
    },
    [setColumnWidth],
  )

  // Memoize file path getter
  const memoizedGetSelectedPaths = useMemo(() => {
    return getSelectedPaths || (() => Array.from(selectedPaths))
  }, [getSelectedPaths, selectedPaths])

  // Get actual file index
  const getFileIndex = useCallback(
    (virtualIndex: number): number => {
      if (!hasInlineEdit) return virtualIndex
      if (virtualIndex === inlineEditIndex) return -1
      if (virtualIndex < inlineEditIndex) return virtualIndex
      return virtualIndex - 1
    },
    [hasInlineEdit, inlineEditIndex],
  )

  const virtualItems = virtualizer.getVirtualItems()

  return (
    <div className={cn("flex flex-col h-full min-h-0", className)}>
      {/* Column Header */}
      <ColumnHeader
        columnWidths={layout.columnWidths}
        onColumnResize={handleColumnResize}
        className="shrink-0"
      />

      {/* Scrollable content */}
      <div ref={parentRef} className="flex-1 overflow-auto min-h-0" style={{ contain: "strict" }}>
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {virtualItems.map((virtualRow) => {
            const fileIndex = getFileIndex(virtualRow.index)
            const isInlineEditRow = fileIndex === -1

            if (isInlineEditRow && mode) {
              return (
                <div
                  key="inline-edit"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <InlineEditRow
                    mode={mode}
                    initialName={
                      mode === "rename" && targetPath ? getBasename(targetPath) : undefined
                    }
                    onConfirm={handleConfirm}
                    onCancel={cancel}
                    columnWidths={layout.columnWidths}
                  />
                </div>
              )
            }

            const file = files[fileIndex]
            if (!file) return null

            // Skip file being renamed
            if (mode === "rename" && file.path === targetPath) {
              return null
            }

            return (
              <div
                key={file.path}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <FileRow
                  file={file}
                  isSelected={selectedPaths.has(file.path)}
                  isFocused={fileIndex === focusedIndex}
                  onSelect={(e) => {
                    onSelect(file.path, e)
                    setFocusedIndex(fileIndex)
                  }}
                  onOpen={() => onOpen(file.path, file.is_dir)}
                  onDrop={onDrop}
                  getSelectedPaths={memoizedGetSelectedPaths}
                  columnWidths={layout.columnWidths}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
