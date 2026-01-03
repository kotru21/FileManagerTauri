import { FileQuestion } from "lucide-react"
import type { FileEntry } from "@/shared/api/tauri"
import { cn } from "@/shared/lib"
import { useFolderPreview } from "../lib/useFolderPreview"
import { usePreviewPanel } from "../lib/usePreviewPanel"
import FileMetadata from "./FileMetadata"
import FilePreviewContent from "./FilePreviewContent"
import FolderPreview from "./FolderPreview"

interface PreviewPanelProps {
  file: FileEntry | null
  onClose?: () => void
  className?: string
}

export function PreviewPanel({ file, onClose, className }: PreviewPanelProps) {
  const { preview, isLoading, error, fileEntry, setFileEntry, openFilePreview } =
    usePreviewPanel(file)

  // initialize folder hook (call at top-level to preserve hooks ordering)
  const folderHook = useFolderPreview(file, { onOpenFile: openFilePreview })

  if (!file) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center p-8 text-muted-foreground",
          className,
        )}
      >
        <FileQuestion className="h-12 w-12 mb-4" />
        <p className="text-sm">Выберите файл для предпросмотра</p>
      </div>
    )
  }

  const activeFile = fileEntry ?? file

  const MAX_DISPLAY_NAME = 24
  const activeDisplayName =
    activeFile?.name && activeFile.name.length > MAX_DISPLAY_NAME
      ? `${activeFile.name.slice(0, MAX_DISPLAY_NAME)}…`
      : (activeFile?.name ?? activeFile?.path)

  const handleClose = () => {
    setFileEntry(null)
    if (onClose) onClose()
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex-1 min-w-0">
          <h3
            className="font-medium truncate leading-tight whitespace-nowrap"
            title={activeFile?.name ?? activeFile?.path}
          >
            {activeDisplayName}
          </h3>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center p-4 text-muted-foreground">
            <FileQuestion className="h-12 w-12 mb-4" />
            <p className="text-sm text-center">{error}</p>
          </div>
        ) : activeFile?.is_dir ? (
          <FolderPreview file={activeFile} hook={folderHook} />
        ) : preview ? (
          <FilePreviewContent
            preview={preview}
            fileName={activeFile?.name ?? activeFile?.path}
            filePath={activeFile?.path}
            onClose={handleClose}
          />
        ) : null}
      </div>

      {activeFile && <FileMetadata file={activeFile} />}
    </div>
  )
}
