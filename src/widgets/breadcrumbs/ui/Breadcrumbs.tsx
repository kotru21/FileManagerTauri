import { useMemo } from "react";
import { ChevronRight, Home } from "lucide-react";
import { useNavigationStore } from "@/features/navigation";
import { cn } from "@/shared/lib";

interface BreadcrumbsProps {
  className?: string;
}

export function Breadcrumbs({ className }: BreadcrumbsProps) {
  const currentPath = useNavigationStore((s) => s.currentPath);
  const navigate = useNavigationStore((s) => s.navigate);

  const parts = useMemo(() => {
    if (!currentPath) return [];

    const normalized = currentPath.replace(/\\/g, "/");
    const segments = normalized.split("/").filter(Boolean);

    return segments.map((segment, index) => {
      const path = segments.slice(0, index + 1).join("\\");
      // Windows drive letter handling
      const fullPath = segments[0].includes(":") ? path : `\\${path}`;
      return { name: segment, path: fullPath };
    });
  }, [currentPath]);

  if (!currentPath) {
    return (
      <nav
        className={cn("flex items-center gap-1 text-sm", className)}
        aria-label="Навигация по пути">
        <Home className="h-4 w-4" aria-hidden="true" />
        <span className="text-muted-foreground">Главная</span>
      </nav>
    );
  }

  return (
    <nav
      className={cn(
        "flex items-center gap-1 text-sm overflow-hidden",
        className
      )}
      aria-label="Навигация по пути">
      <ol className="flex items-center gap-1 min-w-0 list-none m-0 p-0">
        {parts.map((part, index) => (
          <li key={part.path} className="flex items-center gap-1 min-w-0">
            {index > 0 && (
              <ChevronRight
                className="h-4 w-4 text-muted-foreground shrink-0"
                aria-hidden="true"
              />
            )}
            <button
              onClick={() => navigate(part.path)}
              className={cn(
                "hover:text-foreground transition-colors truncate max-w-[200px]",
                index === parts.length - 1
                  ? "text-foreground font-medium"
                  : "text-muted-foreground"
              )}
              title={part.path}
              aria-current={index === parts.length - 1 ? "page" : undefined}
              aria-label={`Перейти к ${part.name}`}>
              {part.name}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
