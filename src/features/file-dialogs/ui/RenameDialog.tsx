import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
} from "@/shared/ui";

interface RenameDialogProps {
  isOpen: boolean;
  value: string;
  onValueChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  isLoading?: boolean;
}

export function RenameDialog({
  isOpen,
  value,
  onValueChange,
  onOpenChange,
  onSubmit,
  isLoading,
}: RenameDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Переименовать</DialogTitle>
        </DialogHeader>
        <Input
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder="Новое имя"
          autoFocus
          onKeyDown={(e) => e.key === "Enter" && onSubmit()}
          aria-label="Новое имя файла или папки"
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={onSubmit} disabled={!value.trim() || isLoading}>
            Переименовать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
