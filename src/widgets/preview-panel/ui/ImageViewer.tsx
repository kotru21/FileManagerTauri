import { openPath } from "@tauri-apps/plugin-opener"
import { File, RefreshCw, RotateCw, X, ZoomIn, ZoomOut } from "lucide-react"
import { useRef, useState } from "react"
import { toast } from "@/shared/ui"

type ImagePreview = {
  type: "Image"
  mime: string
  base64: string
}

export default function ImageViewer({
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
          <button
            type="button"
            className="btn-ghost p-1"
            aria-label="zoom-in"
            data-testid="zoom-in"
            onClick={zoomIn}
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="btn-ghost p-1"
            aria-label="zoom-out"
            data-testid="zoom-out"
            onClick={zoomOut}
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="btn-ghost p-1"
            aria-label="rotate"
            data-testid="rotate"
            onClick={rotateCW}
          >
            <RotateCw className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1" />
        <div className="text-xs text-muted-foreground">{fileName}</div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-ghost p-1"
            aria-label="open"
            data-testid="open"
            onClick={openFile}
          >
            <File className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="btn-ghost p-1"
            aria-label="reset"
            data-testid="reset"
            onClick={reset}
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="btn-ghost p-1"
            aria-label="close"
            data-testid="close"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
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
