import type { FileEntry } from "@/shared/api/tauri"
import type { FileExplorerHandlers } from "./types"
import { VirtualFileList } from "./VirtualFileList"

interface Props {
  className?: string
  files: FileEntry[]
  selectedPaths: Set<string>
  handlers: FileExplorerHandlers
  onQuickLook?: (file: FileEntry) => void
}

export function FileExplorerVirtualList({
  className,
  files,
  selectedPaths,
  handlers,
  onQuickLook,
}: Props) {
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
