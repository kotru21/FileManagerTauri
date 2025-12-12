// src/widgets/breadcrumbs/ui/Breadcrumbs.tsx
import { ChevronRight, Home } from "lucide-react";
import { useMemo } from "react";
import { useNavigationStore } from "@/features/navigation";
import { cn } from "@/shared/lib";

interface BreadcrumbsProps {
  className?: string;
}

interface BreadcrumbSegment {
  name: string;
  path: string;
}

export function Breadcrumbs({ className }: BreadcrumbsProps) {
  const { currentPath, navigate, goHome } = useNavigationStore();
  console.log("Breadcrumbs currentPath:", JSON.stringify(currentPath));
  const segments = useMemo((): BreadcrumbSegment[] => {
    // Если нет пути - возвращаем пустой массив
    if (!currentPath || currentPath.trim() === "") {
      return [];
    }

    // Нормализуем путь: заменяем все backslash на forward slash
    const normalizedPath = currentPath.replace(/\\/g, "/");

    // Убираем trailing slash и разбиваем
    const cleanPath = normalizedPath.replace(/\/+$/, "");
    const parts = cleanPath.split("/").filter((part) => part !== "");

    if (parts.length === 0) {
      return [];
    }

    const result: BreadcrumbSegment[] = [];

    // Проверяем Windows путь (D:, C:, и т.д.)
    const firstPart = parts[0];
    const isWindowsDrive = /^[A-Za-z]:$/.test(firstPart);

    if (isWindowsDrive) {
      // Windows path: D: -> D:\
      result.push({
        name: firstPart,
        path: `${firstPart}\\`,
      });

      // Собираем остальные сегменты
      let accumulated = `${firstPart}\\`;
      for (let i = 1; i < parts.length; i++) {
        accumulated = `${accumulated}${parts[i]}`;
        result.push({
          name: parts[i],
          path: accumulated,
        });
        accumulated = `${accumulated}\\`;
      }
    } else {
      // Unix-like path
      let accumulated = "";
      for (const part of parts) {
        accumulated = `${accumulated}/${part}`;
        result.push({
          name: part,
          path: accumulated,
        });
      }
    }

    return result;
  }, [currentPath]);

  return (
    <nav
      className={cn("flex items-center gap-1 text-sm min-w-0", className)}
      aria-label="Breadcrumb">
      {/* Home button */}
      <button
        type="button"
        onClick={goHome}
        className={cn(
          "flex items-center justify-center w-7 h-7 rounded flex-shrink-0",
          "hover:bg-accent transition-colors",
          currentPath === null && "bg-accent"
        )}
        title="Домой"
        aria-label="Домой">
        <Home className="w-4 h-4" />
      </button>

      {/* Segments */}
      {segments.map((segment, index) => (
        <div key={segment.path} className="flex items-center gap-1 min-w-0">
          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <button
            type="button"
            onClick={() => navigate(segment.path)}
            className={cn(
              "px-2 py-1 rounded truncate max-w-[200px]",
              "hover:bg-accent transition-colors",
              index === segments.length - 1
                ? "text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground"
            )}
            title={segment.path}>
            {segment.name}
          </button>
        </div>
      ))}
    </nav>
  );
}
