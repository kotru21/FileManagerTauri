import { useState, useRef, useEffect, useCallback } from "react";
import { Folder, File } from "lucide-react";
import { cn } from "@/shared/lib";

interface InlineEditRowProps {
  mode: "new-folder" | "new-file" | "rename";
  initialName?: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
  columnWidths?: {
    size: number;
    date: number;
    padding: number;
  };
}

export function InlineEditRow({
  mode,
  initialName = "",
  onConfirm,
  onCancel,
  columnWidths = { size: 100, date: 150, padding: 16 },
}: InlineEditRowProps) {
  const [value, setValue] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      // Для переименования выделяем имя без расширения
      if (mode === "rename" && initialName) {
        const dotIndex = initialName.lastIndexOf(".");
        if (dotIndex > 0) {
          inputRef.current.setSelectionRange(0, dotIndex);
        } else {
          inputRef.current.select();
        }
      } else {
        inputRef.current.select();
      }
    }
  }, [mode, initialName]);

  const validateName = useCallback((name: string): string | null => {
    if (!name.trim()) {
      return "Имя не может быть пустым";
    }
    // Windows forbidden characters
    const forbiddenChars = /[<>:"/\\|?*]/;
    if (forbiddenChars.test(name)) {
      return "Имя содержит недопустимые символы";
    }
    // Reserved Windows names
    const reserved = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
    if (reserved.test(name.split(".")[0])) {
      return "Это имя зарезервировано системой";
    }
    return null;
  }, []);

  const handleConfirm = useCallback(() => {
    const trimmed = value.trim();
    const validationError = validateName(trimmed);
    if (validationError) {
      setError(validationError);
      return;
    }
    onConfirm(trimmed);
  }, [value, validateName, onConfirm]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleConfirm();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    },
    [handleConfirm, onCancel]
  );

  const handleBlur = useCallback(() => {
    // Небольшая задержка чтобы проверить не был ли клик по кнопке
    setTimeout(() => {
      if (document.activeElement !== inputRef.current) {
        if (value.trim()) {
          handleConfirm();
        } else {
          onCancel();
        }
      }
    }, 100);
  }, [value, handleConfirm, onCancel]);

  const Icon = mode === "new-folder" ? Folder : File;
  const placeholder =
    mode === "new-folder"
      ? "Новая папка"
      : mode === "new-file"
      ? "Новый файл.txt"
      : "";

  return (
    <div
      className={cn(
        "flex items-center h-7 px-2 text-sm",
        "bg-accent border border-primary rounded"
      )}>
      <Icon size={18} className="mr-3 shrink-0 text-muted-foreground" />

      <div className="flex-1 min-w-0 flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={cn(
            "flex-1 bg-transparent outline-none",
            "border-none focus:ring-0",
            "text-foreground placeholder:text-muted-foreground",
            error && "text-destructive"
          )}
          spellCheck={false}
          autoComplete="off"
        />
      </div>

      <span
        className="text-muted-foreground text-right shrink-0"
        style={{ width: columnWidths.size }}>
        —
      </span>
      <span
        className="text-muted-foreground text-right shrink-0"
        style={{ width: columnWidths.date }}>
        —
      </span>
      <span style={{ width: columnWidths.padding }} />

      {error && (
        <div className="absolute left-0 top-full mt-1 px-2 py-1 bg-destructive text-destructive-foreground text-xs rounded shadow-lg z-50">
          {error}
        </div>
      )}
    </div>
  );
}
