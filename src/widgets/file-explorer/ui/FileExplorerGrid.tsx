import type { FileEntry } from "@/shared/api/tauri"
import { FileGrid } from "./FileGrid"
import type { FileExplorerHandlers } from "./types"

interface Props {
  className?: string
  files: FileEntry[]
  selectedPaths: Set<string>
  handlers: FileExplorerHandlers
}

export function FileExplorerGrid({ className, files, selectedPaths, handlers }: Props) {
  return (
    <div className={className}>
      <FileGrid
        files={files}
        selectedPaths={selectedPaths}
        onSelect={handlers.handleSelect}
        onOpen={handlers.handleOpen}
        onDrop={handlers.handleDrop}
      />
    </div>
  )
}
