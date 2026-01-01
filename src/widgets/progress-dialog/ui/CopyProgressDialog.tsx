import { X } from "lucide-react"
import { useEffect, useState } from "react"
import type { CopyProgressEvent } from "@/shared/api/tauri"
import { tauriEvents } from "@/shared/api/tauri"
import { Button } from "@/shared/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog"

interface CopyProgressDialogProps {
  open: boolean
  onCancel?: () => void
  onComplete?: () => void
}

export function CopyProgressDialog({ open, onCancel, onComplete }: CopyProgressDialogProps) {
  const [progress, setProgress] = useState<CopyProgressEvent | null>(null)

  useEffect(() => {
    if (!open) return

    const unlisten = tauriEvents.copyProgress((e) => {
      setProgress(e.payload)
      if (e.payload.current === e.payload.total) {
        setTimeout(() => {
          onComplete?.()
          setProgress(null)
        }, 500)
      }
    })

    return () => {
      unlisten.then((fn) => fn())
    }
  }, [open, onComplete])

  if (!open || !progress) return null

  const percent = Math.round((progress.current / progress.total) * 100)
  const fileName = progress.file.split(/[/\\]/).pop() || progress.file

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Копирование файлов...</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-between text-sm">
            <span>Прогресс</span>
            <span>
              {progress.current} / {progress.total}
            </span>
          </div>

          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>

          <p className="text-xs text-muted-foreground truncate" title={fileName}>
            {fileName}
          </p>

          {onCancel && (
            <Button variant="outline" onClick={onCancel} className="w-full">
              <X className="w-4 h-4 mr-2" />
              Отмена
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
