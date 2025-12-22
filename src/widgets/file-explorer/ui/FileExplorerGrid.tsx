import type { FileEntry } from "@/shared/api/tauri"
import { FileGrid } from "./FileGrid"
import type { FileExplorerHandlers } from "./types"

interface Props {
  className?: string
  files: FileEntry[]
  selectedPaths: Set<string>
  onQuickLook?: (file: FileEntry) => void
  handlers: FileExplorerHandlers
}

export function FileExplorerGrid({
  className,
  files,
  selectedPaths,
  onQuickLook,
  handlers,
}: Props) {
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
