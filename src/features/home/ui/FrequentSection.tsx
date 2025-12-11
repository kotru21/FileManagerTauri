import { HomeItem } from "./HomeItem";
import { useMemo } from "react";
import { cn } from "@/shared/lib";
import { useHomeStore } from "@/features/home";
import { HOME } from "@/shared/config";
import { Star } from "lucide-react";
import { VIEW_MODES } from "@/shared/config";

interface FrequentSectionProps {
  viewMode?: (typeof VIEW_MODES)[keyof typeof VIEW_MODES];
  onOpenDir?: (path: string) => void;
}

export function FrequentSection({ viewMode, onOpenDir }: FrequentSectionProps) {
  const items = useHomeStore((s) => s.items);
  const frequent = useMemo(
    () =>
      Object.values(items)
        .filter((i) => !i.pinned && i.openCount >= HOME.MIN_OPEN_COUNT)
        .sort((a, b) => b.openCount - a.openCount)
        .slice(0, HOME.MAX_FREQUENT_ITEMS),
    [items]
  );
  const handleOpen = (path: string) => onOpenDir?.(path);

  const mode = viewMode ?? VIEW_MODES.list;

  if (frequent.length === 0) return null;

  return (
    <section>
      <h3 className="px-3 py-2 text-sm font-semibold flex items-center gap-2">
        <Star className="h-4 w-4 text-muted-foreground" aria-hidden />
        <span>Часто используемые</span>
      </h3>
      <div
        className={cn(
          "px-3 py-2",
          mode === VIEW_MODES.grid ? "grid grid-cols-6 gap-2" : "flex flex-col"
        )}>
        {frequent.map((item) => (
          <HomeItem
            key={item.path}
            item={item}
            onOpenDir={handleOpen}
            viewMode={mode}
          />
        ))}
      </div>
    </section>
  );
}

export default FrequentSection;
