import type { SortConfig } from "@/entities/file-entry"
import { ColumnHeader, FileRow } from "@/entities/file-entry"
import type { ColumnWidths } from "@/features/layout"
import type { AppearanceSettings, FileDisplaySettings } from "@/features/settings"
import type { ViewMode } from "@/features/view-mode"
import type { FileEntry } from "@/shared/api/tauri"
import { FileGrid } from "./FileGrid"
import { VirtualFileList } from "./VirtualFileList"

interface FileExplorerViewProps {
  className?: string
  isLoading: boolean
  files: FileEntry[]
  processedFilesCount: number
  selectedPaths: Set<string>
  onQuickLook?: (file: FileEntry) => void
  handlers: {
    handleSelect: (path: string, e: React.MouseEvent) => void
    handleOpen: (path: string, isDir: boolean) => void
    handleDrop: (sources: string[], destination: string) => void
    handleCreateFolder: (name: string) => void
    handleCreateFile: (name: string) => void
    handleRename: (oldPath: string, newName: string) => void
    handleCopy: () => void
    handleCut: () => void
    handlePaste: () => void
    handleDelete: () => void
    handleStartNewFolder: () => void
    handleStartNewFile: () => void
    handleStartRenameAt: (path: string) => void
  }
  viewMode: ViewMode
  showColumnHeadersInSimpleList: boolean
  columnWidths: ColumnWidths
  setColumnWidth: (column: keyof ColumnWidths, width: number) => void
  performanceThreshold: number
  // New props: settings and sorting provided by container
  displaySettings?: FileDisplaySettings
  appearance?: AppearanceSettings
  performanceSettings?: { lazyLoadImages: boolean; thumbnailCacheSize: number }
  sortConfig?: SortConfig
  onSort?: (field: SortConfig["field"]) => void
}

export function FileExplorerView({
  className,
  isLoading,
  files,
  selectedPaths,
  onQuickLook,
  handlers,
  viewMode,
  showColumnHeadersInSimpleList,
  columnWidths,
  setColumnWidth,
  performanceThreshold,
  displaySettings,
  appearance,
  performanceSettings: _performanceSettings,
  sortConfig,
  onSort,
}: FileExplorerViewProps) {
  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center">Загрузка...</div>
  }

  if (viewMode === "grid") {
    return (
      <div className={className}>
        <FileGrid
          files={files}
          selectedPaths={selectedPaths}
          onSelect={handlers.handleSelect}
          onOpen={handlers.handleOpen}
          onDrop={handlers.handleDrop}
          onQuickLook={onQuickLook}
        />
      </div>
    )
  }

  const simpleListThreshold = performanceThreshold
  if (files.length < simpleListThreshold) {
    const display = displaySettings ?? {
      showFileExtensions: true,
      showFileSizes: true,
      showFileDates: true,
      dateFormat: "relative",
      thumbnailSize: "medium",
    }
    const appearanceLocal = appearance ?? { reducedMotion: false }

    return (
      <div className={className ?? "h-full overflow-auto"}>
        {showColumnHeadersInSimpleList && (
          <div className="px-2">
            <ColumnHeader
              columnWidths={columnWidths}
              onColumnResize={(column: keyof ColumnWidths, width: number) =>
                setColumnWidth(column, width)
              }
              sortConfig={sortConfig ?? { field: "name", direction: "asc" }}
              onSort={onSort ?? (() => {})}
              displaySettings={{
                showFileSizes: display.showFileSizes,
                showFileDates: display.showFileDates,
              }}
            />
          </div>
        )}

        {files.map((file) => (
          <div key={file.path} className="px-2">
            <FileRow
              file={file}
              isSelected={selectedPaths.has(file.path)}
              onSelect={(e) => handlers.handleSelect(file.path, e)}
              onOpen={() => handlers.handleOpen(file.path, file.is_dir)}
              onRename={() => handlers.handleStartRenameAt(file.path)}
              onCopy={handlers.handleCopy}
              onCut={handlers.handleCut}
              onDelete={handlers.handleDelete}
              onQuickLook={onQuickLook ? () => onQuickLook(file) : undefined}
              columnWidths={columnWidths}
              displaySettings={display}
              appearance={appearanceLocal}
            />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={className}>
      <VirtualFileList
        files={files}
        selectedPaths={selectedPaths}
        onSelect={handlers.handleSelect}
        onOpen={handlers.handleOpen}
        onDrop={handlers.handleDrop}
        getSelectedPaths={() => Array.from(selectedPaths)}
        onCreateFolder={handlers.handleCreateFolder}
        onCreateFile={handlers.handleCreateFile}
        onRename={handlers.handleRename}
        onCopy={handlers.handleCopy}
        onCut={handlers.handleCut}
        onDelete={handlers.handleDelete}
        onQuickLook={onQuickLook}
      />
    </div>
  )
}
