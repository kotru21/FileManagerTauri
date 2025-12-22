import { HardDrive } from "lucide-react"
import type { DriveInfo } from "@/shared/api/tauri"
import { cn } from "@/shared/lib"

interface DriveItemProps {
  drive: DriveInfo
  isSelected: boolean
  onSelect: () => void
}

export function DriveItem({ drive, isSelected, onSelect }: DriveItemProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md",
        // Only show hover highlight when not selected to avoid flipping selected state color
        !isSelected && "hover:bg-accent/50",
        "transition-colors text-left",
        isSelected ? "bg-accent text-accent-foreground" : "text-muted-foreground",
      )}
    >
      <HardDrive
        size={16}
        className={cn(
          "h-4 w-4",
          isSelected ? "icon-fill-accent icon-accent-foreground" : "text-muted-foreground",
        )}
      />
      <span className="truncate">{drive.name}</span>
    </button>
  )
}
