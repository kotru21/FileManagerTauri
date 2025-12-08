import { useDrives } from "@/entities/file-entry";
import { DriveItem } from "@/entities/drive";
import { useNavigationStore } from "@/features/navigation";
import { ScrollArea, Separator } from "@/shared/ui";
import { cn } from "@/shared/lib";

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const { data: drives = [] } = useDrives();
  const currentPath = useNavigationStore((s) => s.currentPath);
  const navigate = useNavigationStore((s) => s.navigate);

  return (
    <aside className={cn("flex flex-col border-r", className)}>
      <div className="p-2 font-medium text-sm text-muted-foreground">Диски</div>
      <Separator />
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {drives.map((drive) => (
            <DriveItem
              key={drive.path}
              drive={drive}
              isSelected={currentPath?.startsWith(drive.path) ?? false}
              onSelect={() => navigate(drive.path)}
            />
          ))}
        </div>
      </ScrollArea>
    </aside>
  );
}
