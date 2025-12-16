import { useVirtualizer } from "@tanstack/react-virtual"
import { useCallback, useEffect, useMemo, useRef } from "react"
import { ColumnHeader, FileRow, InlineEditRow } from "@/entities/file-entry"
import { useBookmarksStore } from "@/features/bookmarks"
import { useClipboardStore } from "@/features/clipboard"
import { useInlineEditStore } from "@/features/inline-edit"
import { useKeyboardNavigation } from "@/features/keyboard-navigation"
import { useLayoutStore } from "@/features/layout"
import { RubberBandOverlay } from "@/features/rubber-band"
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
  onCopy?: () => void
  onCut?: () => void
  onDelete?: () => void
  onQuickLook?: (file: FileEntry) => void
  className?: string
}

function findLastIndex<T>(arr: T[], predicate: (item: T) => boolean): number {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (predicate(arr[i])) return i
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
  onCopy,
  onCut,
  onDelete,
  onQuickLook,
  className,
}: VirtualFileListProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  const { mode, targetPath, parentPath } = useInlineEditStore()
  const { layout, setColumnWidth } = useLayoutStore()
  const { columnWidths } = layout

  // Get clipboard state for cut indication
  const clipboardPaths = useClipboardStore((s) => s.paths)
  const isCutMode = useClipboardStore((s) => s.isCut())
  const cutPathsSet = useMemo(
    () => (isCutMode ? new Set(clipboardPaths) : new Set<string>()),
    [clipboardPaths, isCutMode],
  )

  // Get bookmarks state
  const isBookmarked = useBookmarksStore((s) => s.isBookmarked)
  const addBookmark = useBookmarksStore((s) => s.addBookmark)
  const removeBookmark = useBookmarksStore((s) => s.removeBookmark)
  const getBookmarkByPath = useBookmarksStore((s) => s.getBookmarkByPath)

  // Find index where inline edit row should appear
  const inlineEditIndex = useMemo(() => {
    if (!mode) return -1
    if (mode === "rename" && targetPath) {
      return files.findIndex((f) => f.path === targetPath)
    }
    if ((mode === "new-folder" || mode === "new-file") && parentPath) {
      // Insert after last folder for new items
      const lastFolderIdx = findLastIndex(files, (f) => f.is_dir)
      return lastFolderIdx + 1
    }
    return 0
  }, [mode, targetPath, parentPath, files])

  // Calculate total rows
  const totalRows = files.length + (mode && mode !== "rename" ? 1 : 0)

  // Virtualizer
  const virtualizer = useVirtualizer({
    count: totalRows,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32,
    overscan: 10,
  })

  // Keyboard navigation
  const { focusedIndex } = useKeyboardNavigation({
    files,
    selectedPaths,
    onSelect: (path, e) => onSelect(path, e as unknown as React.MouseEvent),
    onOpen: (path, isDir) => onOpen(path, isDir),
    enabled: !mode,
  })

  // Scroll to inline edit row
  useEffect(() => {
    if (mode && inlineEditIndex >= 0) {
      virtualizer.scrollToIndex(inlineEditIndex, { align: "center" })
    }
  }, [mode, inlineEditIndex, virtualizer])

  // Memoize handlers
  const handleSelect = useCallback(
    (path: string) => (e: React.MouseEvent) => onSelect(path, e),
    [onSelect],
  )

  const handleOpen = useCallback(
    (path: string, isDir: boolean) => () => onOpen(path, isDir),
    [onOpen],
  )

  const handleQuickLook = useCallback((file: FileEntry) => () => onQuickLook?.(file), [onQuickLook])

  const handleToggleBookmark = useCallback(
    (path: string) => () => {
      if (isBookmarked(path)) {
        const bookmark = getBookmarkByPath(path)
        if (bookmark) removeBookmark(bookmark.id)
      } else {
        addBookmark(path)
      }
    },
    [isBookmarked, getBookmarkByPath, removeBookmark, addBookmark],
  )

  // Memoize file path getter
  const memoizedGetSelectedPaths = useCallback(() => {
    return getSelectedPaths?.() ?? Array.from(selectedPaths)
  }, [getSelectedPaths, selectedPaths])

  // Helper to get path from element
  const getPathFromElement = useCallback((element: Element): string | null => {
    return element.getAttribute("data-path")
  }, [])

  const handleColumnResize = useCallback(
    (column: "size" | "date" | "padding", width: number) => {
      setColumnWidth(column, width)
    },
    [setColumnWidth],
  )

  const handleInlineConfirm = useCallback(
    (name: string) => {
      if (mode === "new-folder") {
        onCreateFolder?.(name)
      } else if (mode === "new-file") {
        onCreateFile?.(name)
      } else if (mode === "rename" && targetPath) {
        onRename?.(targetPath, name)
      }
    },
    [mode, targetPath, onCreateFolder, onCreateFile, onRename],
  )

  const handleInlineCancel = useCallback(() => {
    useInlineEditStore.getState().cancel()
  }, [])

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Column Header */}
      <ColumnHeader
        columnWidths={columnWidths}
        onColumnResize={handleColumnResize}
        className="shrink-0"
      />

      {/* Scrollable content */}
      <div ref={parentRef} className="flex-1 overflow-auto relative">
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            // Check if this is the inline edit row position
            const isInlineEditRow =
              mode && mode !== "rename" && virtualRow.index === inlineEditIndex

            if (isInlineEditRow) {
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
                    mode={mode as "new-folder" | "new-file"}
                    onConfirm={handleInlineConfirm}
                    onCancel={handleInlineCancel}
                    columnWidths={columnWidths}
                  />
                </div>
              )
            }

            // Get actual file index
            const fileIndex =
              mode && mode !== "rename" && virtualRow.index > inlineEditIndex
                ? virtualRow.index - 1
                : virtualRow.index

            const file = files[fileIndex]
            if (!file) return null

            // Skip file being renamed (show inline edit instead)
            if (mode === "rename" && file.path === targetPath) {
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
                  <InlineEditRow
                    mode="rename"
                    initialName={getBasename(file.path)}
                    onConfirm={handleInlineConfirm}
                    onCancel={handleInlineCancel}
                    columnWidths={columnWidths}
                  />
                </div>
              )
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
                  isCut={cutPathsSet.has(file.path)}
                  isBookmarked={isBookmarked(file.path)}
                  onSelect={handleSelect(file.path)}
                  onOpen={handleOpen(file.path, file.is_dir)}
                  onDrop={onDrop}
                  getSelectedPaths={memoizedGetSelectedPaths}
                  onCopy={onCopy}
                  onCut={onCut}
                  onRename={() => useInlineEditStore.getState().startRename(file.path)}
                  onDelete={onDelete}
                  onQuickLook={onQuickLook ? handleQuickLook(file) : undefined}
                  onToggleBookmark={handleToggleBookmark(file.path)}
                  columnWidths={columnWidths}
                />
              </div>
            )
          })}
        </div>

        {/* Rubber Band Selection */}
        <RubberBandOverlay
          containerRef={parentRef as React.RefObject<HTMLElement>}
          fileSelector="[data-path]"
          getPathFromElement={getPathFromElement}
        />
      </div>
    </div>
  )
}
