import { useMemo } from "react"
import { getBasename } from "@/shared/lib"
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui"

interface DeleteConfirmDialogProps {
  isOpen: boolean
  paths: string[]
  permanent: boolean
  onPermanentChange: (permanent: boolean) => void
  onOpenChange: (open: boolean) => void
  onConfirm: (opts: { paths: string[]; permanent: boolean }) => void
  isLoading?: boolean
}

export function DeleteConfirmDialog({
  isOpen,
  paths,
  permanent,
  onPermanentChange,
  onOpenChange,
  onConfirm,
  isLoading,
}: DeleteConfirmDialogProps) {
  const title = useMemo(() => {
    if (paths.length === 1) return "Удалить элемент"
    return `Удалить элементы (${paths.length})`
  }, [paths.length])

  const previewNames = useMemo(() => {
    const names = paths.map(getBasename)
    return names.slice(0, 3)
  }, [paths])

  const description = useMemo(() => {
    if (paths.length === 0) return "Нечего удалять."

    if (permanent) {
      return "Элементы будут удалены навсегда (минуя корзину). Действие нельзя отменить."
    }

    return "Элементы будут перемещены в корзину. При необходимости их можно восстановить."
  }, [paths.length, permanent])

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {paths.length > 0 && (
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <div className="text-muted-foreground">Будет удалено:</div>
            <ul className="mt-2 list-disc pl-5">
              {previewNames.map((n) => (
                <li key={n} className="truncate">
                  {n}
                </li>
              ))}
              {paths.length > 3 && (
                <li className="text-muted-foreground">…и ещё {paths.length - 3}</li>
              )}
            </ul>
          </div>
        )}

        <label className="flex items-center gap-2 text-sm select-none">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={permanent}
            onChange={(e) => onPermanentChange(e.target.checked)}
          />
          <span>
            Удалить навсегда <span className="text-muted-foreground">(Shift+Del)</span>
          </span>
        </label>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Отмена
          </Button>
          <Button
            variant="destructive"
            onClick={() => onConfirm({ paths, permanent })}
            disabled={paths.length === 0 || isLoading}
          >
            {permanent ? "Удалить навсегда" : "Удалить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
