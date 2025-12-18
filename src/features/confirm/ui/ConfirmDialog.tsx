import { Button } from "@/shared/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog"
import { useConfirmStore } from "../model/store"

export function ConfirmDialog() {
  const { isOpen, title, message, confirm, cancel } = useConfirmStore()

  return (
    <Dialog open={isOpen} onOpenChange={() => cancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title || "Подтверждение"}</DialogTitle>
        </DialogHeader>

        <div className="py-2 text-sm text-muted-foreground">{message}</div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => cancel()}>
            Отмена
          </Button>
          <Button onClick={() => confirm()}>Подтвердить</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
