import { Pin } from "lucide-react"
import { useMemo } from "react"
import { useHomeStore } from "@/features/home"
import { VIEW_MODES } from "@/shared/config"
import { cn } from "@/shared/lib"
import { HomeItem } from "./HomeItem"

interface PinnedSectionProps {
  viewMode?: (typeof VIEW_MODES)[keyof typeof VIEW_MODES]
  onOpenDir?: (path: string) => void
}

export function PinnedSection({ viewMode, onOpenDir }: PinnedSectionProps) {
  const items = useHomeStore((s) => s.items)
  const pinned = useMemo(
    () =>
      Object.values(items)
        .filter((i) => i.pinned)
        .sort((a, b) => b.lastOpened - a.lastOpened),
    [items],
  )

  const handleOpen = (path: string) => onOpenDir?.(path)

  const mode = viewMode ?? VIEW_MODES.list

  return (
    <section>
      <h3 className="px-3 py-2 text-sm font-semibold flex items-center gap-2">
        <Pin className="h-4 w-4 text-muted-foreground" aria-hidden />
        <span>Закреплённые</span>
      </h3>
      {pinned.length === 0 ? (
        <div className="px-3 py-2 text-muted-foreground">
          Закрепите файлы и папки для быстрого доступа
        </div>
      ) : (
        <div
          className={cn(
            "px-3 py-2",
            mode === VIEW_MODES.grid ? "grid grid-cols-6 gap-2" : "flex flex-col",
          )}
        >
          {pinned.map((item) => (
            <HomeItem key={item.path} item={item} onOpenDir={handleOpen} viewMode={mode} />
          ))}
        </div>
      )}
    </section>
  )
}

export default PinnedSection
