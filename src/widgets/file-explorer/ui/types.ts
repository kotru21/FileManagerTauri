import type { SortConfig } from "@/entities/file-entry"
import type { ColumnWidths } from "@/features/layout"
import type { AppearanceSettings, FileDisplaySettings } from "@/features/settings"
import type { ViewMode } from "@/features/view-mode"
import type { FileEntry } from "@/shared/api/tauri"

/**
 * Common modifier keys interface for selection events.
 * Compatible with both MouseEvent and KeyboardEvent.
 */
export interface SelectionModifiers {
  ctrlKey?: boolean
  shiftKey?: boolean
  metaKey?: boolean
}

export type FileExplorerHandlers = {
  handleSelect: (path: string, e: SelectionModifiers) => void
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

export interface FileExplorerViewProps {
  className?: string
  isLoading: boolean
  files: FileEntry[]
  processedFilesCount: number
  selectedPaths: Set<string>
  handlers: FileExplorerHandlers
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
