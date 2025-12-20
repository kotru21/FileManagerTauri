import { FileExplorerGrid } from "./FileExplorerGrid"
import { FileExplorerLoading } from "./FileExplorerLoading"
import { FileExplorerSimpleList } from "./FileExplorerSimpleList"
import { FileExplorerVirtualList } from "./FileExplorerVirtualList"
import type { FileExplorerViewProps } from "./types"
import { useFileExplorer } from "./useFileExplorer"

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
  const { display, appearanceLocal } = useFileExplorer({ displaySettings, appearance })

  if (isLoading) {
    return <FileExplorerLoading className={className} />
  }

  if (viewMode === "grid") {
    return (
      <FileExplorerGrid
        className={className}
        files={files}
        selectedPaths={selectedPaths}
        onQuickLook={onQuickLook}
        handlers={handlers}
      />
    )
  }

  const simpleListThreshold = performanceThreshold
  if (files.length < simpleListThreshold) {
    return (
      <FileExplorerSimpleList
        className={className}
        files={files}
        selectedPaths={selectedPaths}
        handlers={handlers}
        showColumnHeadersInSimpleList={showColumnHeadersInSimpleList}
        columnWidths={columnWidths}
        setColumnWidth={setColumnWidth}
        sortConfig={sortConfig}
        onSort={onSort}
        displaySettings={display}
        appearanceLocal={appearanceLocal}
        onQuickLook={onQuickLook}
      />
    )
  }

  return (
    <FileExplorerVirtualList
      className={className}
      files={files}
      selectedPaths={selectedPaths}
      handlers={handlers}
      onQuickLook={onQuickLook}
    />
  )
}
