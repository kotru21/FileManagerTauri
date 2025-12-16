import { FileQuestion, FileText, Image, Loader2, X } from "lucide-react"
import { useEffect, useState } from "react"
import { commands, type FileEntry, type FilePreview } from "@/shared/api/tauri"
import { cn, formatBytes, formatDate, getExtension } from "@/shared/lib"
import { Button, ScrollArea } from "@/shared/ui"

interface PreviewPanelProps {
  file: FileEntry | null
  onClose?: () => void
  className?: string
}

export function PreviewPanel({ file, onClose, className }: PreviewPanelProps) {
  const [preview, setPreview] = useState<FilePreview | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!file || file.is_dir) {
      setPreview(null)
      setError(null)
      return
    }

    const loadPreview = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await commands.getFilePreview(file.path)
        if (result.status === "ok") {
          setPreview(result.data)
        } else {
          setError(result.error)
        }
      } catch (err) {
        setError(String(err))
      } finally {
        setIsLoading(false)
      }
    }

    loadPreview()
  }, [file])

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

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate">{file.name}</h3>
          <p className="text-xs text-muted-foreground">
            {file.is_dir ? "Папка" : formatBytes(file.size)}
            {file.modified && ` • ${formatDate(file.modified)}`}
          </p>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="ml-2">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center p-4 text-muted-foreground">
            <FileQuestion className="h-12 w-12 mb-4" />
            <p className="text-sm text-center">{error}</p>
          </div>
        ) : file.is_dir ? (
          <FolderPreview file={file} />
        ) : preview ? (
          <FilePreviewContent preview={preview} fileName={file.name} />
        ) : null}
      </div>

      {/* Metadata */}
      <FileMetadata file={file} />
    </div>
  )
}

function FilePreviewContent({ preview, fileName }: { preview: FilePreview; fileName: string }) {
  if (preview.type === "Text") {
    return (
      <ScrollArea className="h-full">
        <pre className="p-4 text-sm font-mono whitespace-pre-wrap wrap-break-word">
          {preview.content}
          {preview.truncated && (
            <span className="text-muted-foreground italic">{"\n\n... (содержимое обрезано)"}</span>
          )}
        </pre>
      </ScrollArea>
    )
  }

  if (preview.type === "Image") {
    return (
      <div className="flex h-full items-center justify-center p-4 bg-muted/20">
        <img
          src={`data:${preview.mime};base64,${preview.base64}`}
          alt={fileName}
          className="max-h-full max-w-full object-contain rounded"
        />
      </div>
    )
  }

  // Unsupported
  return (
    <div className="flex h-full flex-col items-center justify-center p-4 text-muted-foreground">
      <FileText className="h-12 w-12 mb-4" />
      <p className="text-sm">Предпросмотр недоступен</p>
      <p className="text-xs mt-1">{preview.mime}</p>
    </div>
  )
}

function FolderPreview({ file }: { file: FileEntry }) {
  const [itemCount, setItemCount] = useState<number | null>(null)

  useEffect(() => {
    const loadCount = async () => {
      try {
        const result = await commands.readDirectory(file.path)
        if (result.status === "ok") {
          setItemCount(result.data.length)
        }
      } catch {
        // Ignore errors
      }
    }
    loadCount()
  }, [file.path])

  return (
    <div className="flex h-full flex-col items-center justify-center p-4 text-muted-foreground">
      <div className="w-20 h-20 mb-4 rounded-lg bg-muted flex items-center justify-center">
        <Image className="h-10 w-10" />
      </div>
      <p className="text-sm font-medium text-foreground">{file.name}</p>
      {itemCount !== null && (
        <p className="text-xs mt-1">
          {itemCount} {itemCount === 1 ? "элемент" : "элементов"}
        </p>
      )}
    </div>
  )
}

function FileMetadata({ file }: { file: FileEntry }) {
  const extension = getExtension(file.name)

  return (
    <div className="border-t border-border p-4 space-y-2 text-sm">
      <MetadataRow label="Тип" value={file.is_dir ? "Папка" : extension?.toUpperCase() || "Файл"} />
      {!file.is_dir && <MetadataRow label="Размер" value={formatBytes(file.size)} />}
      {file.modified && <MetadataRow label="Изменён" value={formatDate(file.modified)} />}
      {file.created && <MetadataRow label="Создан" value={formatDate(file.created)} />}
      <MetadataRow label="Путь" value={file.path} className="break-all" />
    </div>
  )
}

function MetadataRow({
  label,
  value,
  className,
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div className="flex gap-2">
      <span className="text-muted-foreground shrink-0">{label}:</span>
      <span className={cn("text-foreground", className)}>{value}</span>
    </div>
  )
}
