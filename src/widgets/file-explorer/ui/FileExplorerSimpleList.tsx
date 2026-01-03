import { ColumnHeader, FileRow, InlineEditRow, type SortConfig } from "@/entities/file-entry"
import type { ColumnWidths } from "@/entities/layout"
import { useInlineEditStore } from "@/features/inline-edit"
import type { AppearanceSettings, FileDisplaySettings } from "@/features/settings"
import type { FileEntry } from "@/shared/api/tauri"
import { findLastIndex } from "@/shared/lib"
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
}: Props) {
  const mode = useInlineEditStore((s) => s.mode)
  const targetPath = useInlineEditStore((s) => s.targetPath)
  const inlineCancel = useInlineEditStore((s) => s.cancel)

  const lastFolderIndex = findLastIndex(files, (f) => f.is_dir)
  const newItemIndex = lastFolderIndex + 1

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

      {/* Inline edit support for simple list (rename / new file / new folder) */}
      {files.map((file, idx) => {
        // If we're inserting a new item and this is the insertion spot, render InlineEditRow
        if (mode && mode !== "rename" && idx === newItemIndex) {
          return (
            <div key="inline-edit" className="px-2">
              <InlineEditRow
                mode={mode}
                onConfirm={(name) => {
                  if (mode === "new-folder") handlers.handleCreateFolder?.(name)
                  else if (mode === "new-file") handlers.handleCreateFile?.(name)
                  inlineCancel()
                }}
                onCancel={() => inlineCancel()}
                columnWidths={columnWidths}
              />
            </div>
          )
        }

        // If rename mode targets this file, render InlineEditRow in place
        if (mode === "rename" && targetPath === file.path) {
          return (
            <div key={file.path} className="px-2">
              <InlineEditRow
                mode="rename"
                initialName={file.name}
                onConfirm={(name) => {
                  handlers.handleRename?.(file.path, name)
                  inlineCancel()
                }}
                onCancel={() => inlineCancel()}
                columnWidths={columnWidths}
              />
            </div>
          )
        }

        return (
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
              columnWidths={columnWidths}
              displaySettings={displaySettings}
              appearance={appearanceLocal}
            />
          </div>
        )
      })}
    </div>
  )
}
