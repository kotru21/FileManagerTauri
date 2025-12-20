import { ColumnHeader, FileRow, type SortConfig } from "@/entities/file-entry"
import type { ColumnWidths } from "@/features/layout"
import type { AppearanceSettings, FileDisplaySettings } from "@/features/settings"
import type { FileEntry } from "@/shared/api/tauri"
import type { FileExplorerHandlers } from "./types"

interface Props {
  className?: string
  files: FileEntry[]
  selectedPaths: Set<string>
  handlers: FileExplorerHandlers
  showColumnHeadersInSimpleList: boolean
  columnWidths: ColumnWidths
  setColumnWidth: (column: keyof ColumnWidths, width: number) => void
  sortConfig?: SortConfig
  onSort?: (field: SortConfig["field"]) => void
  displaySettings: FileDisplaySettings
  appearanceLocal: AppearanceSettings
  onQuickLook?: (file: FileEntry) => void
}

export function FileExplorerSimpleList({
  className,
  files,
  selectedPaths,
  handlers,
  showColumnHeadersInSimpleList,
  columnWidths,
  setColumnWidth,
  sortConfig,
  onSort,
  displaySettings,
  appearanceLocal,
  onQuickLook,
}: Props) {
  return (
    <div className={className ?? "h-full overflow-auto"} role="listbox" aria-multiselectable={true}>
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
              showFileSizes: displaySettings.showFileSizes,
              showFileDates: displaySettings.showFileDates,
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
            displaySettings={displaySettings}
            appearance={appearanceLocal}
          />
        </div>
      ))}
    </div>
  )
}
