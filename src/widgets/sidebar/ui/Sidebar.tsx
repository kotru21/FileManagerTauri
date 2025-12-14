import { useRef } from "react"
import { DriveItem } from "@/entities/drive"
import { useDrives } from "@/entities/file-entry"
import { useHomeStore } from "@/features/home"
import { useNavigationStore } from "@/features/navigation"
import { cn, getBasename } from "@/shared/lib"
import { ScrollArea, Separator } from "@/shared/ui"

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const { data: drives = [], isLoading, error } = useDrives()
  const currentPath = useNavigationStore((s) => s.currentPath)
  const navigate = useNavigationStore((s) => s.navigate)
  const trackOpen = useHomeStore((s) => s.trackOpen)

  const selectHandlerCache = useRef<Map<string, () => void>>(new Map())
  const getSelectHandler = (drivePath: string, driveName?: string) => {
    const cached = selectHandlerCache.current.get(drivePath)
    if (cached) return cached
    const handler = () => {
      trackOpen(drivePath, true, driveName)
      navigate(drivePath)
    }
    selectHandlerCache.current.set(drivePath, handler)
    return handler
  }

  return (
    <aside className={cn("flex flex-col border-r", className)}>
      <div className="p-2 font-medium text-sm text-muted-foreground">Диски</div>
      <Separator />
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {isLoading ? (
            <div className="text-sm text-muted-foreground px-3 py-2">Загрузка...</div>
          ) : error ? (
            <div className="text-sm text-destructive px-3 py-2">Ошибка: {String(error)}</div>
          ) : drives.length === 0 ? (
            <div className="text-sm text-muted-foreground px-3 py-2">Нет дисков</div>
          ) : (
            drives.map((drive) => (
              <DriveItem
                key={drive.path}
                drive={drive}
                isSelected={currentPath?.startsWith(drive.path) ?? false}
                onSelect={getSelectHandler(drive.path, drive.label ?? getBasename(drive.path))}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </aside>
  )
}
