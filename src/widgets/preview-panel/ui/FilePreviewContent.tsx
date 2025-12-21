import { FileText } from "lucide-react"
import type { FilePreview } from "@/shared/api/tauri"
import ImageViewer from "./ImageViewer"

export default function FilePreviewContent({
  preview,
  fileName,
  filePath,
  onClose,
}: {
  preview: FilePreview
  fileName: string
  filePath: string
  onClose?: () => void
}) {
  if (preview.type === "Text") {
    return (
      <div className="h-full overflow-auto">
        <pre className="p-4 text-sm font-mono whitespace-pre-wrap wrap-break-word">
          {preview.content}
          {preview.truncated && (
            <span className="text-muted-foreground italic">{"\n\n... (содержимое обрезано)"}</span>
          )}
        </pre>
      </div>
    )
  }

  if (preview.type === "Image") {
    return (
      <ImageViewer preview={preview} fileName={fileName} filePath={filePath} onClose={onClose} />
    )
  }

  return (
    <div className="flex h-full flex-col items-center justify-center p-4 text-muted-foreground">
      <FileText className="h-12 w-12 mb-4" />
      <p className="text-sm">Предпросмотр недоступен</p>
      <p className="text-xs mt-1">{preview.mime}</p>
    </div>
  )
}
