import { File, Folder, HardDrive, Loader2 } from "lucide-react"
import { useMemo } from "react"
import { useDirectoryContents } from "@/entities/file-entry"
import { useClipboardStore } from "@/features/clipboard"
import { useSelectionStore } from "@/features/file-selection"
import { useNavigationStore } from "@/features/navigation"
import { useQuickFilterStore } from "@/features/quick-filter"
import { useSearchStore } from "@/features/search-content"
import { cn, formatBytes } from "@/shared/lib"
import { Separator } from "@/shared/ui"

interface StatusBarProps {
  className?: string
}

export function StatusBar({ className }: StatusBarProps) {
  const { currentPath } = useNavigationStore()
  const { data: files = [], isLoading, isFetching } = useDirectoryContents(currentPath)
  const { getSelectedPaths } = useSelectionStore()
  const { hasContent, paths: clipboardPaths, isCut } = useClipboardStore()
  const { filter, isActive: isFilterActive } = useQuickFilterStore()
  const { isSearching, results: searchResults } = useSearchStore()

  const stats = useMemo(() => {
    const selected = getSelectedPaths()
    const selectedFiles = files.filter((f) => selected.includes(f.path))

    const totalSize = selectedFiles.reduce((acc, f) => acc + (f.is_dir ? 0 : f.size), 0)
    const folderCount = files.filter((f) => f.is_dir).length
    const fileCount = files.filter((f) => !f.is_dir).length
    const selectedFolderCount = selectedFiles.filter((f) => f.is_dir).length
    const selectedFileCount = selectedFiles.filter((f) => !f.is_dir).length

    return {
      totalSize,
      folderCount,
      fileCount,
      selectedCount: selected.length,
      selectedFolderCount,
      selectedFileCount,
    }
  }, [files, getSelectedPaths])

  const filteredCount = useMemo(() => {
    if (!isFilterActive || !filter) return files.length
    const lowerFilter = filter.toLowerCase()
    return files.filter((f) => f.name.toLowerCase().includes(lowerFilter)).length
  }, [files, filter, isFilterActive])

  return (
    <div
      className={cn(
        "flex items-center justify-between h-6 px-3 text-xs bg-muted/30 border-t border-border",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        {(isLoading || isFetching || isSearching) && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>{isSearching ? "Поиск..." : "Загрузка..."}</span>
          </div>
        )}

        {searchResults.length > 0 && !isSearching && (
          <div className="text-muted-foreground">Найдено: {searchResults.length} результат(ов)</div>
        )}

        {!isSearching && searchResults.length === 0 && (
          <>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Folder className="h-3 w-3" />
              <span>{stats.folderCount}</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <File className="h-3 w-3" />
              <span>{stats.fileCount}</span>
            </div>

            {isFilterActive && filter && (
              <>
                <Separator orientation="vertical" className="h-3" />
                <span className="text-muted-foreground">
                  Показано: {filteredCount} из {files.length}
                </span>
              </>
            )}
          </>
        )}
      </div>

      {/* Center section - Selection info */}
      <div className="flex items-center gap-3">
        {stats.selectedCount > 0 && (
          <div className="flex items-center gap-2">
            <span>
              Выбрано: {stats.selectedCount}
              {stats.selectedFolderCount > 0 && stats.selectedFileCount > 0 && (
                <span className="text-muted-foreground ml-1">
                  ({stats.selectedFolderCount} папок, {stats.selectedFileCount} файлов)
                </span>
              )}
            </span>
            {stats.totalSize > 0 && (
              <>
                <Separator orientation="vertical" className="h-3" />
                <span className="text-muted-foreground">{formatBytes(stats.totalSize)}</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Right section - Clipboard & Path */}
      <div className="flex items-center gap-3">
        {/* Clipboard indicator */}
        {hasContent() && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <span className={cn(isCut() && "text-yellow-500")}>
              {isCut() ? "Вырезано" : "Скопировано"}: {clipboardPaths.length}
            </span>
          </div>
        )}

        {/* Current path */}
        {currentPath && (
          <>
            <Separator orientation="vertical" className="h-3" />
            <div
              className="flex items-center gap-1 text-muted-foreground max-w-xs truncate"
              title={currentPath}
            >
              <HardDrive className="h-3 w-3 shrink-0" />
              <span className="truncate">{currentPath}</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
