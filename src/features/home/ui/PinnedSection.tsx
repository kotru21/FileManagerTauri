import { HomeItem } from "./HomeItem";
import { useLayoutStore } from "@/features/layout";
import { VIEW_MODES } from "@/shared/config";
import { useMemo } from "react";
import { cn } from "@/shared/lib";
import { useHomeStore } from "@/features/home";
import { Pin } from "lucide-react";
import { useNavigationStore } from "@/features/navigation";

export function PinnedSection() {
  const items = useHomeStore((s) => s.items);
  const pinned = useMemo(
    () =>
      Object.values(items)
        .filter((i) => i.pinned)
        .sort((a, b) => b.lastOpened - a.lastOpened),
    [items]
  );
  const navigate = useNavigationStore((s) => s.navigate);

  const handleOpen = (path: string) => navigate(path);

  const viewMode = useLayoutStore((s) => s.layout.viewMode ?? VIEW_MODES.list);

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
            viewMode === VIEW_MODES.grid
              ? "grid grid-cols-6 gap-2"
              : "flex flex-col"
          )}>
          {pinned.map((item) => (
            <HomeItem key={item.path} item={item} onOpenDir={handleOpen} />
          ))}
        </div>
      )}
    </section>
  );
}

export default PinnedSection;
