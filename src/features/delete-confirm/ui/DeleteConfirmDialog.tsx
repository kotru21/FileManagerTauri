import { AlertTriangle, Trash2 } from "lucide-react"
import { useMemo } from "react"
import { getBasename } from "@/shared/lib"
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  ScrollArea,
} from "@/shared/ui"
import { useDeleteConfirmStore } from "../model/store"

export function DeleteConfirmDialog() {
  const { isOpen, paths, permanent, confirm, cancel } = useDeleteConfirmStore()

  const fileNames = useMemo(() => {
    return paths.map((p) => getBasename(p))
  }, [paths])

  const title = permanent ? "Удалить навсегда?" : "Переместить в корзину?"
  const description = permanent
    ? "Эти файлы будут удалены безвозвратно. Это действие нельзя отменить."
    : "Файлы будут перемещены в корзину. Вы сможете восстановить их позже."

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && cancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {permanent ? (
              <AlertTriangle className="h-5 w-5 text-destructive" />
            ) : (
              <Trash2 className="h-5 w-5 text-muted-foreground" />
            )}
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{description}</p>

          {/* File list */}
          <div className="rounded-md border bg-muted/30">
            <ScrollArea className="max-h-40">
              <div className="p-2 space-y-1">
                {fileNames.slice(0, 10).map((name, index) => (
                  <div
                    key={paths[index]}
                    className="text-sm truncate px-2 py-1 rounded bg-background/50"
                    title={paths[index]}
                  >
                    {name}
                  </div>
                ))}
                {fileNames.length > 10 && (
                  <div className="text-sm text-muted-foreground px-2 py-1">
                    ...и ещё {fileNames.length - 10} файл(ов)
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="text-sm text-muted-foreground">Всего: {paths.length} элемент(ов)</div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={cancel}>
            Отмена
          </Button>
          <Button variant={permanent ? "destructive" : "default"} onClick={confirm}>
            {permanent ? "Удалить навсегда" : "В корзину"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
