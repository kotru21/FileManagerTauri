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
  const segments = useMemo((): BreadcrumbSegment[] => {
    // If no path, return an empty array
    if (!currentPath || currentPath.trim() === "") {
      return [];
    }

    // Normalize path: replace backslashes with forward slashes
    const normalizedPath = currentPath.replace(/\\/g, "/");

    // Trim trailing slashes and split
    const cleanPath = normalizedPath.replace(/\/+$/, "");
    const parts = cleanPath.split("/").filter((part) => part !== "");

    if (parts.length === 0) {
      return [];
    }

    const result: BreadcrumbSegment[] = [];

    // Check for Windows drive path (D:, C:, etc.)
    const firstPart = parts[0];
    const isWindowsDrive = /^[A-Za-z]:$/.test(firstPart);

    if (isWindowsDrive) {
      // Windows path: D: -> D:\
      result.push({
        name: firstPart,
        path: `${firstPart}\\`,
      });

      // Accumulate remaining segments
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
          "flex items-center justify-center w-7 h-7 rounded shrink-0",
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
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          <button
            type="button"
            onClick={() => navigate(segment.path)}
            className={cn(
              "px-2 py-1 rounded truncate max-w-50",
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
