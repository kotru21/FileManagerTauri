import { useVirtualizer } from "@tanstack/react-virtual"
import { useCallback, useEffect, useMemo, useRef } from "react"
import { ColumnHeader, FileRow, InlineEditRow } from "@/entities/file-entry"
import { useBookmarksStore } from "@/features/bookmarks"
import { useClipboardStore } from "@/features/clipboard"
import { useInlineEditStore } from "@/features/inline-edit"
import { useKeyboardNavigation } from "@/features/keyboard-navigation"
import { useLayoutStore } from "@/features/layout"
import { RubberBandOverlay } from "@/features/rubber-band"
import { useFileDisplaySettings, useAppearanceSettings } from "@/features/settings"
import { useSortingStore } from "@/features/sorting"
import type { FileEntry } from "@/shared/api/tauri"
import { cn } from "@/shared/lib"

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
  const { mode, targetPath } = useInlineEditStore()
  const columnWidths = useLayoutStore((s) => s.layout.columnWidths)
  const setColumnWidth = useLayoutStore((s) => s.setColumnWidth)

  // Get display & appearance settings and sorting (widgets are allowed to consume features)
  const displaySettings = useFileDisplaySettings()
  const appearance = useAppearanceSettings()
  const { sortConfig, setSortField } = useSortingStore()

  // Get clipboard state for cut indication
  const cutPaths = useClipboardStore((s) => s.paths)
  const isCut = useClipboardStore((s) => s.isCut)

  // Get bookmarks state
  const isBookmarked = useBookmarksStore((s) => s.isBookmarked)
  const addBookmark = useBookmarksStore((s) => s.addBookmark)
  const removeBookmark = useBookmarksStore((s) => s.removeBookmark)
  const getBookmarkByPath = useBookmarksStore((s) => s.getBookmarkByPath)
  const inlineCancel = useInlineEditStore((s) => s.cancel)
  const startRename = useInlineEditStore((s) => s.startRename)

  const safeSelectedPaths = useMemo(() => {
    return selectedPaths instanceof Set ? selectedPaths : new Set<string>()
  }, [selectedPaths])

  const inlineEditIndex = useMemo(() => {
    if (mode === "rename" && targetPath) {
      return files.findIndex((f) => f.path === targetPath)
    }
    if (mode === "new-folder" || mode === "new-file") {
      // Insert after last folder for new items
      const lastFolderIndex = findLastIndex(files, (f) => f.is_dir)
      return lastFolderIndex + 1
    }
    return -1
  }, [mode, targetPath, files])

  // Calculate total rows
  const totalRows = files.length + (mode && mode !== "rename" ? 1 : 0)

  // Virtualizer
  const rowVirtualizer = useVirtualizer({
    count: totalRows,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32,
    overscan: 10,
  })

  // Instrument virtualization timings
  useEffect(() => {
    try {
      const now = Date.now()
      globalThis.__fm_perfLog = {
        ...(globalThis.__fm_perfLog ?? {}),
        virtualizer: { totalRows, overscan: 10, ts: now },
      }
      console.debug(`[perf] virtualizer`, { totalRows, overscan: 10 })
    } catch {
      /* ignore */
    }
  }, [totalRows])

  // Keyboard navigation - pass safe selectedPaths
  const { focusedIndex } = useKeyboardNavigation({
    files,
    selectedPaths: safeSelectedPaths,
    onSelect: (path, e) => {
      onSelect(path, e as unknown as React.MouseEvent)
    },
    onOpen,
    enabled: !mode, // Disable when editing
  })

  // Scroll to inline edit row
  useEffect(() => {
    if (inlineEditIndex >= 0) {
      rowVirtualizer.scrollToIndex(inlineEditIndex, { align: "center" })
    }
  }, [inlineEditIndex, rowVirtualizer])

  // Memoize handlers
  const handleSelect = useCallback(
    (path: string) => (e: React.MouseEvent) => {
      onSelect(path, e)
    },
    [onSelect],
  )

  const handleOpen = useCallback(
    (path: string, isDir: boolean) => () => {
      onOpen(path, isDir)
    },
    [onOpen],
  )

  const handleQuickLook = useCallback(
    (file: FileEntry) => () => {
      onQuickLook?.(file)
    },
    [onQuickLook],
  )

  const handleToggleBookmark = useCallback(
    (path: string) => () => {
      if (isBookmarked(path)) {
        const bookmark = getBookmarkByPath(path)
        if (bookmark) removeBookmark(bookmark.id)
      } else {
        addBookmark(path)
      }
    },
    [isBookmarked, addBookmark, removeBookmark, getBookmarkByPath],
  )

  // Memoize file path getter
  const handleGetSelectedPaths = useCallback(() => {
    return getSelectedPaths?.() ?? Array.from(safeSelectedPaths)
  }, [getSelectedPaths, safeSelectedPaths])

  // Helper to get path from element
  const getPathFromElement = useCallback((element: Element): string | null => {
    return element.getAttribute("data-path")
  }, [])

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Column Header */}
      <ColumnHeader
        columnWidths={columnWidths}
        onColumnResize={(column, width) => {
          setColumnWidth(column, width)
        }}
        sortConfig={sortConfig}
        onSort={setSortField}
        displaySettings={displaySettings}
        className="shrink-0"
      />

      {/* Scrollable content */}
      <div ref={parentRef} className="flex-1 overflow-auto relative">
        <div className="relative w-full" style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const rowIndex = virtualRow.index

            if (mode && mode !== "rename" && rowIndex === inlineEditIndex) {
              return (
                <div
                  key="inline-edit"
                  className="absolute left-0 right-0"
                  style={{
                    top: virtualRow.start,
                    height: virtualRow.size,
                  }}
                >
                  <InlineEditRow
                    mode={mode}
                    onConfirm={(name) => {
                      if (mode === "new-folder") onCreateFolder?.(name)
                      else if (mode === "new-file") onCreateFile?.(name)
                    }}
                    onCancel={() => inlineCancel()}
                    columnWidths={columnWidths}
                  />
                </div>
              )
            }

            // Get actual file index
            const fileIndex =
              mode && mode !== "rename" && rowIndex > inlineEditIndex ? rowIndex - 1 : rowIndex

            const file = files[fileIndex]
            if (!file) return null

            // Skip file being renamed (show inline edit instead)
            if (mode === "rename" && file.path === targetPath) {
              return (
                <div
                  key={file.path}
                  className="absolute left-0 right-0"
                  style={{
                    top: virtualRow.start,
                    height: virtualRow.size,
                  }}
                >
                  <InlineEditRow
                    mode="rename"
                    initialName={file.name}
                    onConfirm={(newName) => onRename?.(file.path, newName)}
                    onCancel={() => inlineCancel()}
                    columnWidths={columnWidths}
                  />
                </div>
              )
            }

            const isFileCut = isCut() && cutPaths.includes(file.path)

            return (
              <div
                key={file.path}
                className="absolute left-0 right-0"
                style={{
                  top: virtualRow.start,
                  height: virtualRow.size,
                }}
              >
                <FileRow
                  file={file}
                  isSelected={safeSelectedPaths.has(file.path)}
                  isFocused={focusedIndex === fileIndex}
                  isCut={isFileCut}
                  isBookmarked={isBookmarked(file.path)}
                  onSelect={handleSelect(file.path)}
                  onOpen={handleOpen(file.path, file.is_dir)}
                  onDrop={onDrop}
                  getSelectedPaths={handleGetSelectedPaths}
                  onCopy={onCopy}
                  onCut={onCut}
                  onRename={() => startRename(file.path)}
                  onDelete={onDelete}
                  onQuickLook={onQuickLook ? handleQuickLook(file) : undefined}
                  onToggleBookmark={handleToggleBookmark(file.path)}
                  columnWidths={columnWidths}
                  displaySettings={displaySettings}
                  appearance={appearance}
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
