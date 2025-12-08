import type { FileEntry } from "@/shared/api/tauri";
import { formatBytes, formatDate, cn } from "@/shared/lib";
import { FileIcon } from "./FileIcon";

interface FileRowProps {
  file: FileEntry;
  isSelected: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onOpen: () => void;
}

export function FileRow({ file, isSelected, onSelect, onOpen }: FileRowProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-1.5 cursor-pointer select-none",
        "hover:bg-accent/50 transition-colors",
        isSelected && "bg-accent"
      )}
      onClick={onSelect}
      onDoubleClick={onOpen}>
      <FileIcon extension={file.extension} isDir={file.is_dir} size={18} />

      <span className="flex-1 truncate text-sm">{file.name}</span>

      {!file.is_dir && (
        <span className="text-xs text-muted-foreground w-20 text-right">
          {formatBytes(file.size)}
        </span>
      )}

      <span className="text-xs text-muted-foreground w-32 text-right">
        {formatDate(file.modified)}
      </span>
    </div>
  );
}
