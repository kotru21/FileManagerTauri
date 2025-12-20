import { openPath } from "@tauri-apps/plugin-opener"
import {
  File,
  FileQuestion,
  FileText,
  Folder,
  Loader2,
  RefreshCw,
  RotateCw,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { FileThumbnail } from "@/entities/file-entry/ui/FileThumbnail"
import type { FileEntry, FilePreview } from "@/shared/api/tauri"
import { tauriClient } from "@/shared/api/tauri/client"
import { cn, formatBytes, formatDate, getExtension } from "@/shared/lib"
import { Button, ScrollArea, toast } from "@/shared/ui"

interface PreviewPanelProps {
  file: FileEntry | null
  onClose?: () => void
  className?: string
}

export function PreviewPanel({ file, onClose, className }: PreviewPanelProps) {
  const [preview, setPreview] = useState<FilePreview | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Local resolved metadata for the file (FileEntry with all fields)
  const [fileEntry, setFileEntry] = useState<FileEntry | null>(null)

  // callback to open a file preview from nested components
  const openFilePreview = (entry: FileEntry, p: FilePreview) => {
    setPreview(p)
    setFileEntry(entry)
  }

  // callback to open a folder preview from nested components
  const openFolderPreview = (entry: FileEntry) => {
    // clear any previous file preview
    setPreview(null)
    setFileEntry(entry)
  }

  // Resolve missing metadata (name/size) when only path is provided
  useEffect(() => {
    let cancelled = false

    const resolveMetadata = async () => {
      // Reset file entry immediately to avoid showing stale preview
      setFileEntry(null)

      if (!file) {
        return
      }

      // If full entry provided, use as-is
      if (file.name != null || file.size != null || file.modified != null || file.created != null) {
        setFileEntry(file)
        return
      }

      try {
        const parentPath = await tauriClient.getParentPath(file.path)
        if (parentPath) {
          const dir = await tauriClient.readDirectory(parentPath)
          const found = dir.find((f: FileEntry) => f.path === file.path)
          if (!cancelled) {
            if (found) setFileEntry(found)
            else
              setFileEntry({
                ...file,
                name: file.path.split("\\").pop() || file.path,
                size: 0,
                is_dir: false,
                is_hidden: false,
                extension: null,
                modified: null,
                created: null,
              })
          }
          return
        }
      } catch {
        // ignore
      }

      if (!cancelled)
        setFileEntry({
          ...file,
          name: file.path.split("\\").pop() || file.path,
          size: 0,
          is_dir: false,
          is_hidden: false,
          extension: null,
          modified: null,
          created: null,
        })
    }

    resolveMetadata()

    return () => {
      cancelled = true
    }
  }, [file])

  useEffect(() => {
    let cancelled = false

    if (!fileEntry || fileEntry.is_dir) {
      setPreview(null)
      setError(null)
      return
    }

    const loadPreview = async () => {
      // Clear previous preview immediately
      setPreview(null)
      setIsLoading(true)
      setError(null)

      try {
        const preview = await tauriClient.getFilePreview(fileEntry.path)
        if (!cancelled) {
          setPreview(preview)
        }
      } catch (err) {
        if (!cancelled) setError(String(err))
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadPreview()

    return () => {
      cancelled = true
    }
  }, [fileEntry])

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

  // Limit display width of the active file/folder name in the header to avoid layout overflow
  const MAX_DISPLAY_NAME = 24
  const activeDisplayName =
    activeFile?.name && activeFile.name.length > MAX_DISPLAY_NAME
      ? `${activeFile.name.slice(0, MAX_DISPLAY_NAME)}…`
      : (activeFile?.name ?? activeFile?.path)

  const handleClose = () => {
    // Clear internal preview state
    setPreview(null)
    setFileEntry(null)
    // Call external onClose to hide panel if provided
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
          <p className="text-xs text-muted-foreground">
            {activeFile?.is_dir ? "Папка" : formatBytes(activeFile?.size)}
            {activeFile?.modified && ` • ${formatDate(activeFile.modified)}`}
          </p>
        </div>
      </div>

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
        ) : activeFile?.is_dir ? (
          <FolderPreview
            file={activeFile}
            onOpenFile={openFilePreview}
            onOpenFolder={openFolderPreview}
          />
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

function FilePreviewContent({
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
      <ImageViewer preview={preview} fileName={fileName} filePath={filePath} onClose={onClose} />
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

type ImagePreview = Extract<FilePreview, { type: "Image" }>

function ImageViewer({
  preview,
  fileName,
  filePath,
  onClose,
}: {
  preview: ImagePreview
  fileName: string
  filePath: string
  onClose?: () => void
}) {
  const [scale, setScale] = useState(1)
  const [rotate, setRotate] = useState(0)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const zoomIn = () => setScale((s) => Math.round(s * 1.25 * 100) / 100)
  const zoomOut = () => setScale((s) => Math.round((s / 1.25) * 100) / 100)
  const reset = () => {
    setScale(1)
    setRotate(0)
  }
  const rotateCW = () => setRotate((r) => (r + 90) % 360)

  const openFile = async () => {
    if (!filePath) return
    try {
      await openPath(filePath)
    } catch (err) {
      toast.error(`Не удалось открыть файл: ${String(err)}`)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label="zoom-in"
            data-testid="zoom-in"
            onClick={zoomIn}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="zoom-out"
            data-testid="zoom-out"
            onClick={zoomOut}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="rotate"
            data-testid="rotate"
            onClick={rotateCW}
          >
            <RotateCw className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1" />
        <div className="text-xs text-muted-foreground">{fileName}</div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label="open"
            data-testid="open"
            onClick={openFile}
          >
            <File className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="reset"
            data-testid="reset"
            onClick={reset}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="close"
            data-testid="close"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-4 bg-muted/20 flex items-center justify-center"
      >
        <img
          ref={imgRef}
          src={`data:${preview.mime};base64,${preview.base64}`}
          alt={fileName}
          draggable={false}
          style={{
            transform: `scale(${scale}) rotate(${rotate}deg)`,
            objectFit: "contain" as const,
          }}
          className="max-h-full max-w-full transition-transform rounded"
        />
      </div>
    </div>
  )
}

function FolderPreview({
  file,
  onOpenFile,
  onOpenFolder,
}: {
  file: FileEntry
  onOpenFile?: (entry: FileEntry, preview: FilePreview) => void
  onOpenFolder?: (entry: FileEntry) => void
}) {
  const [entries, setEntries] = useState<FileEntry[] | null>(null)
  const [isLoadingEntries, setIsLoadingEntries] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // navigation stack of paths inside preview (allows drilling into subfolders)
  const [pathStack, setPathStack] = useState<string[]>([file.path])

  const handleOpenExternal = async (path: string) => {
    try {
      await openPath(path)
    } catch (err) {
      toast.error(`Не удалось открыть файл: ${String(err)}`)
    }
  }

  const currentPath = pathStack[pathStack.length - 1]

  // Limit display width of the folder name in the header to avoid layout overflow
  const folderDisplayName =
    file.name && file.name.length > 24 ? `${file.name.slice(0, 24)}…` : file.name

  // Reset navigation stack when the previewed root folder changes
  useEffect(() => {
    setPathStack([file.path])
    setEntries(null)
    setError(null)
  }, [file.path])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setIsLoadingEntries(true)
      setError(null)
      try {
        const dir = await tauriClient.readDirectory(currentPath)
        if (!cancelled) setEntries(dir)
      } catch (err) {
        if (!cancelled) setError(String(err))
      } finally {
        if (!cancelled) setIsLoadingEntries(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [currentPath])

  const handleToggleUp = async () => {
    if (pathStack.length > 1) setPathStack((s) => s.slice(0, s.length - 1))
  }

  const handleEnterFolder = (entry: FileEntry) => {
    if (!entry.is_dir) return
    if (onOpenFolder) {
      onOpenFolder(entry)
    } else {
      setPathStack((s) => [...s, entry.path])
    }
  }

  const handleShowFile = async (entry: FileEntry) => {
    if (entry.is_dir) return
    // get preview and open it in the main preview panel via callback if provided
    try {
      setIsLoadingEntries(true)
      const preview = await tauriClient.getFilePreview(entry.path)
      if (onOpenFile) {
        onOpenFile(entry, preview)
      } else {
        // fallback behaviour: render preview inline
        setEntries([{ ...entry, _preview: preview } as unknown as FileEntry])
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setIsLoadingEntries(false)
    }
  }

  return (
    <div className="flex h-full flex-col items-start p-4 text-muted-foreground">
      <div className="flex items-center gap-3 w-full mb-3">
        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
          <Folder className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium truncate leading-tight whitespace-nowrap" title={file.name}>
            {folderDisplayName}
          </h4>
          <p className="text-xs text-muted-foreground truncate">{currentPath}</p>
        </div>
        <div className="flex items-center gap-2">
          {pathStack.length > 1 && (
            <button type="button" className="btn-ghost text-xs" onClick={handleToggleUp}>
              ◀ Назад
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 w-full overflow-auto">
        {isLoadingEntries ? (
          <div className="flex items-center justify-center w-full py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-sm text-muted-foreground">{error}</div>
        ) : entries && entries.length > 0 ? (
          <ul className="space-y-2 w-full">
            {entries.map((e) => (
              <li key={e.path} className="flex items-center justify-between group min-w-0">
                <div className="flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => (e.is_dir ? handleEnterFolder(e) : handleShowFile(e))}
                    className="text-left w-full p-2 rounded hover:bg-muted/30"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 shrink-0 flex items-center justify-center">
                        {e.is_dir ? (
                          <Folder className="h-5 w-5" />
                        ) : (
                          <FileThumbnail
                            path={e.path}
                            extension={getExtension(e.name)}
                            isDir={false}
                            size={32}
                            performanceSettings={{ lazyLoadImages: false, thumbnailCacheSize: 10 }}
                            thumbnailGenerator={{ maxSide: 64 }}
                          />
                        )}
                      </div>
                      <span className="truncate whitespace-nowrap" title={e.name}>
                        {e.name}
                      </span>
                    </div>
                  </button>
                </div>
                {!e.is_dir && (
                  <div className="ml-2 opacity-0 group-hover:opacity-100 transition">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="open-file"
                      data-testid="open-file"
                      onClick={(ev) => {
                        ev.stopPropagation()
                        handleOpenExternal(e.path)
                      }}
                    >
                      <File className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-sm text-muted-foreground">Пустая папка</div>
        )}
      </div>
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
