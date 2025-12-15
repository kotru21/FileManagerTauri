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

const ROW_HEIGHT = 28

// Polyfill for findLastIndex if not available
function findLastIndex<T>(arr: T[], predicate: (item: T) => boolean): number {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (predicate(arr[i])) {
      return i
    }
  }
  return -1
}

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
  const { layout, setColumnWidth } = useLayoutStore()
  const { columnWidths } = layout

  const { mode, targetPath, cancel } = useInlineEditStore()

  // Find index where inline edit row should appear
  const inlineEditIndex = useMemo(() => {
    if (mode === "rename" && targetPath) {
      return files.findIndex((f) => f.path === targetPath)
    }
    if (mode === "new-folder" || mode === "new-file") {
      // New items appear at the top (after folders for files, at start for folders)
      if (mode === "new-folder") {
        return 0
      } else {
        // After last folder
        const lastFolderIndex = findLastIndex(files, (f: FileEntry) => f.is_dir)
        return lastFolderIndex + 1
      }
    }
    return -1
  }, [mode, targetPath, files])

  const hasInlineEdit = mode !== null
  const totalCount = files.length + (hasInlineEdit && mode !== "rename" ? 1 : 0)

  // Keyboard navigation
  const { focusedIndex, setFocusedIndex } = useKeyboardNavigation({
    files,
    selectedPaths,
    onSelect: (path, e) => {
      // Create synthetic mouse event for compatibility
      const syntheticEvent = {
        ctrlKey: e.ctrlKey ?? false,
        shiftKey: e.shiftKey ?? false,
        metaKey: false,
      } as React.MouseEvent
      onSelect(path, syntheticEvent)
    },
    onOpen: (path, isDir) => onOpen(path, isDir),
    enabled: !hasInlineEdit, // Disable when editing
  })

  const virtualizer = useVirtualizer({
    count: totalCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  })

  // Scroll to inline edit row when editing starts so the input is visible
  useEffect(() => {
    if (!mode) return
    if (inlineEditIndex < 0) return
    // Ensure the inline edit row is visible
    virtualizer.scrollToIndex(inlineEditIndex, { align: "start" })
  }, [mode, inlineEditIndex, virtualizer])

  // Memoize handlers
  const handleColumnResize = useCallback(
    (column: "size" | "date" | "padding", width: number) => {
      setColumnWidth(column, Math.max(50, width))
    },
    [setColumnWidth],
  )

  // Memoize file path getter
  const getFilePaths = useCallback(() => {
    return getSelectedPaths?.() ?? Array.from(selectedPaths)
  }, [getSelectedPaths, selectedPaths])

  const handleInlineConfirm = useCallback(
    (name: string) => {
      if (mode === "new-folder" && onCreateFolder) {
        onCreateFolder(name)
      } else if (mode === "new-file" && onCreateFile) {
        onCreateFile(name)
      } else if (mode === "rename" && targetPath && onRename) {
        onRename(targetPath, name)
      }
      cancel()
    },
    [mode, targetPath, onCreateFolder, onCreateFile, onRename, cancel],
  )

  // Calculate actual file index accounting for inline edit row
  const getFileIndex = useCallback(
    (virtualIndex: number): number => {
      if (!hasInlineEdit || mode === "rename") {
        return virtualIndex
      }
      // For new items, adjust index after inline edit position
      if (virtualIndex < inlineEditIndex) {
        return virtualIndex
      }
      if (virtualIndex === inlineEditIndex) {
        return -1 // This is the inline edit row
      }
      return virtualIndex - 1
    },
    [hasInlineEdit, mode, inlineEditIndex],
  )

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <ColumnHeader
        columnWidths={columnWidths}
        onColumnResize={handleColumnResize}
        className="shrink-0 border-b border-border"
      />

      <div ref={parentRef} className="flex-1 overflow-auto">
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const fileIndex = getFileIndex(virtualRow.index)

            // Render inline edit row
            if (fileIndex === -1 || (mode === "rename" && virtualRow.index === inlineEditIndex)) {
              if (!mode) return null
              const isRename = mode === "rename"
              const initialName = isRename && targetPath ? getBasename(targetPath) : ""

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
                    initialName={initialName}
                    onConfirm={handleInlineConfirm}
                    onCancel={cancel}
                    columnWidths={columnWidths}
                  />
                </div>
              )
            }

            // Skip rendering the file being renamed (it's replaced by inline edit)
            if (mode === "rename" && files[fileIndex]?.path === targetPath) {
              return null
            }

            const file = files[fileIndex]
            if (!file) return null

            const isSelected = selectedPaths.has(file.path)
            const isFocused = focusedIndex === fileIndex

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
                  isSelected={isSelected}
                  isFocused={isFocused}
                  onSelect={(e) => {
                    setFocusedIndex(fileIndex)
                    onSelect(file.path, e)
                  }}
                  onOpen={() => onOpen(file.path, file.is_dir)}
                  onDrop={onDrop}
                  getSelectedPaths={getFilePaths}
                  columnWidths={columnWidths}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
