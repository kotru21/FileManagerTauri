import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
} from "@/shared/ui";

interface NewFileDialogProps {
  isOpen: boolean;
  value: string;
  onValueChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  isLoading?: boolean;
}

export function NewFileDialog({
  isOpen,
  value,
  onValueChange,
  onOpenChange,
  onSubmit,
  isLoading,
}: NewFileDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Новый файл</DialogTitle>
        </DialogHeader>
        <Input
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder="Имя файла"
          autoFocus
          onKeyDown={(e) => e.key === "Enter" && onSubmit()}
          aria-label="Имя нового файла"
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={onSubmit} disabled={!value.trim() || isLoading}>
            Создать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
