import { HardDrive } from "lucide-react"
import { memo } from "react"
import type { DriveInfo } from "@/shared/api/tauri"
import { cn, getBasename } from "@/shared/lib"

interface DriveItemProps {
  drive: DriveInfo
  isSelected: boolean
  onSelect: () => void
}

export const DriveItem = memo(function DriveItem({ drive, isSelected, onSelect }: DriveItemProps) {
  const formatShortPath = (p?: string | null) => {
    if (!p) return ""
    // Trim trailing slashes/backslashes and optional trailing separator
    return p.replace(/[\\/]+$/, "")
  }

  const shortPath = formatShortPath(drive.path)

  const primaryText = drive.label
    ? `${drive.label} (${shortPath})`
    : (getBasename(drive.path) ?? drive.path)

  const isRootMount = (p?: string | null) => {
    if (!p) return false
    // Normalize slashes so regex is straightforward
    const normalized = p.replace(/\//g, "\\")
    // Windows drive root like 'D:\' or 'D:/' -> treat as root
    if (/^[A-Za-z]:\\?$/.test(normalized)) return true
    // Unix root '/'
    if (normalized === "/") return true
    return false
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md",
        "hover:bg-accent/50 transition-colors text-left",
        isSelected && "bg-accent",
      )}
    >
      <HardDrive size={16} className="text-blue-500" />
      <div className="flex flex-col items-start leading-tight">
        <span className="truncate">{primaryText}</span>
        {!drive.label && drive.path && !isRootMount(drive.path) && (
          <span className="text-xs text-muted-foreground truncate">{drive.path}</span>
        )}
      </div>
    </button>
  )
})
