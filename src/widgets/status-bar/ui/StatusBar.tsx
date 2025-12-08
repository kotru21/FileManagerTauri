import { useSelectionStore } from "@/features/file-selection";
import { useNavigationStore } from "@/features/navigation";
import { useDirectoryContents } from "@/entities/file-entry";
import { formatBytes } from "@/shared/lib";
import { cn } from "@/shared/lib";

interface StatusBarProps {
  className?: string;
}

export function StatusBar({ className }: StatusBarProps) {
  const currentPath = useNavigationStore((s) => s.currentPath);
  const selectedPaths = useSelectionStore((s) => s.selectedPaths);
  const { data: files = [] } = useDirectoryContents(currentPath);

  const selectedCount = selectedPaths.size;
  const totalCount = files.length;
  const totalSize = files.reduce((acc, f) => acc + (f.is_dir ? 0 : f.size), 0);

  return (
    <footer
      className={cn(
        "flex items-center justify-between px-4 py-1.5 text-xs text-muted-foreground border-t",
        className
      )}>
      <div>
        {selectedCount > 0 ? (
          <span>
            Выбрано: {selectedCount} из {totalCount}
          </span>
        ) : (
          <span>Элементов: {totalCount}</span>
        )}
      </div>
      <div>
        {totalSize > 0 && <span>Размер: {formatBytes(totalSize)}</span>}
      </div>
    </footer>
  );
}
