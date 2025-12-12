import { HardDrive } from "lucide-react";
import type { DriveInfo } from "@/shared/api/tauri";
import { cn } from "@/shared/lib";

interface DriveItemProps {
  drive: DriveInfo;
  isSelected: boolean;
  onSelect: () => void;
}

export function DriveItem({ drive, isSelected, onSelect }: DriveItemProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md",
        "hover:bg-accent/50 transition-colors text-left",
        isSelected && "bg-accent"
      )}>
      <HardDrive size={16} className="text-blue-500" />
      <span className="truncate">{drive.name}</span>
    </button>
  );
}
