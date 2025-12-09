import type { FileEntry } from "@/shared/api/tauri";
import { formatBytes, formatDate, cn } from "@/shared/lib";
import { FileIcon } from "./FileIcon";

interface FileRowProps {
  file: FileEntry;
  isSelected: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onOpen: () => void;
  columnWidths?: {
    size: number;
    date: number;
    padding: number;
  };
}

export function FileRow({
  file,
  isSelected,
  onSelect,
  onOpen,
  columnWidths = { size: 80, date: 140, padding: 12 },
}: FileRowProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-0 px-3 py-1.5 cursor-pointer select-none",
        "hover:bg-accent/50 transition-colors",
        isSelected && "bg-accent"
      )}
      onClick={onSelect}
      onDoubleClick={onOpen}>
      <FileIcon extension={file.extension} isDir={file.is_dir} size={18} />

      <span className="flex-1 truncate text-sm ml-3">{file.name}</span>

      {!file.is_dir && (
        <span
          className="text-xs text-muted-foreground text-right shrink-0 px-2"
          style={{ width: columnWidths.size }}>
          {formatBytes(file.size)}
        </span>
      )}

      <span
        className="text-xs text-muted-foreground text-right shrink-0 px-2"
        style={{ width: columnWidths.date }}>
        {formatDate(file.modified)}
      </span>

      <span className="shrink-0" style={{ width: columnWidths.padding }} />
    </div>
  );
}
