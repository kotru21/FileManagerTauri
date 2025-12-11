import type { FileEntry } from "@/entities/file-entry";
import { cn } from "@/shared/lib";
import { FileIcon } from "./FileIcon";

interface FileCardProps {
  file: FileEntry;
  isSelected: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onOpen: () => void;
}

export function FileCard({
  file,
  isSelected,
  onSelect,
  onOpen,
}: FileCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1 p-3 rounded-lg cursor-pointer select-none",
        "hover:bg-accent/50 transition-colors w-24",
        isSelected && "bg-accent"
      )}
      onClick={onSelect}
      onDoubleClick={onOpen}>
      <FileIcon extension={file.extension} isDir={file.is_dir} size={40} />
      <span className="text-xs text-center truncate w-full" title={file.name}>
        {file.name}
      </span>
    </div>
  );
}
