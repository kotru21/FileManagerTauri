import { homeDir } from "@tauri-apps/api/path"
import { ChevronDown, ChevronRight, Clock, Folder, HardDrive, Home, Star } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { DriveItem } from "@/entities/drive"
import { useDrives } from "@/entities/file-entry"
import { BookmarksList, useBookmarksStore } from "@/features/bookmarks"
import { useLayoutStore } from "@/features/layout"
import { useNavigationStore } from "@/features/navigation"
import { RecentFoldersList, useRecentFoldersStore } from "@/features/recent-folders"
import { cn } from "@/shared/lib"
import { ScrollArea, Separator, Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui"

interface SidebarProps {
  className?: string
  collapsed?: boolean
}

type SidebarSection = "bookmarks" | "recent" | "drives" | "quickAccess"

interface CollapsedItemProps {
  icon: React.ReactNode
  label: string
  isActive?: boolean
  onClick: () => void
}

function CollapsedItem({ icon, label, isActive, onClick }: CollapsedItemProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className={cn(
            "flex h-10 w-full items-center justify-center rounded-md transition-colors",
            isActive
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
          )}
        >
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={10}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

interface SectionHeaderProps {
  title: string
  icon: React.ReactNode
  expanded: boolean
  onToggle: () => void
  collapsed?: boolean
}

function SectionHeader({ title, icon, expanded, onToggle, collapsed }: SectionHeaderProps) {
  if (collapsed) {
    return (
      <div className="flex justify-center py-2">
        <div className="text-muted-foreground">{icon}</div>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
    >
      {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      {icon}
      <span>{title}</span>
    </button>
  )
}

export function Sidebar({ className, collapsed = false }: SidebarProps) {
  const { currentPath, navigate } = useNavigationStore()
  const { data: drives = [] } = useDrives()
  const { bookmarks, addBookmark } = useBookmarksStore()
  const { addFolder } = useRecentFoldersStore()
  const [homePath, setHomePath] = useState<string | null>(null)
  const expandedSections = useLayoutStore((s) => s.layout.expandedSections)
  const toggleSectionExpanded = useLayoutStore((s) => s.toggleSectionExpanded)

  const toggleSection = (section: SidebarSection) => toggleSectionExpanded(section)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    try {
      const data = e.dataTransfer.getData("application/json")
      if (data) {
        const parsed = JSON.parse(data)
        if (parsed.paths?.length > 0) {
          addBookmark(parsed.paths[0])
        }
      }
    } catch {
      void 0
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "link"
  }

  useEffect(() => {
    if (currentPath) {
      addFolder(currentPath)
    }
  }, [currentPath, addFolder])

  useEffect(() => {
    const resolveHome = async () => {
      try {
        const home = await homeDir()
        setHomePath(home)
      } catch {
        if (currentPath) {
          const match = currentPath.match(/^([A-Z]:\\Users\\[^\\]+)/i)
          if (match) setHomePath(match[1])
        }
      }
    }
    resolveHome()
  }, [currentPath])

  const handleNavigate = useCallback(
    (path: string) => {
      navigate(path)
    },
    [navigate],
  )

  if (collapsed) {
    return (
      <div
        className={cn("flex flex-col items-center py-2 px-1 gap-1 h-full bg-muted/30", className)}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {homePath && (
          <CollapsedItem
            icon={<Home className="h-5 w-5" />}
            label="Домой"
            isActive={currentPath === homePath}
            onClick={() => handleNavigate(homePath)}
          />
        )}

        <Separator className="my-1 w-6" />

        {bookmarks.slice(0, 4).map((bookmark) => (
          <CollapsedItem
            key={bookmark.id}
            icon={<Star className="h-5 w-5" />}
            label={bookmark.name}
            isActive={currentPath === bookmark.path}
            onClick={() => handleNavigate(bookmark.path)}
          />
        ))}

        {bookmarks.length > 0 && <Separator className="my-1 w-6" />}
        {drives.map((drive) => (
          <CollapsedItem
            key={drive.path}
            icon={<HardDrive className="h-5 w-5" />}
            label={`${drive.name} (${drive.path})`}
            isActive={currentPath?.startsWith(drive.path)}
            onClick={() => handleNavigate(drive.path)}
          />
        ))}
      </div>
    )
  }

  return (
    <ScrollArea className={cn("h-full", className)}>
      <div className="flex flex-col gap-1 p-2" onDrop={handleDrop} onDragOver={handleDragOver}>
        <div>
          <SectionHeader
            title="Быстрый доступ"
            icon={<Folder className="h-4 w-4" />}
            expanded={expandedSections?.quickAccess ?? true}
            onToggle={() => toggleSection("quickAccess")}
          />
          {(expandedSections?.quickAccess ?? true) && (
            <div className="mt-1 space-y-0.5">
              {homePath && (
                <button
                  type="button"
                  onClick={() => handleNavigate(homePath)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                    currentPath === homePath
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/50",
                  )}
                >
                  <Home className="h-4 w-4" />
                  <span>Домой</span>
                </button>
              )}
            </div>
          )}
        </div>

        <Separator className="my-1" />
        <div>
          <SectionHeader
            title="Закладки"
            icon={<Star className="h-4 w-4" />}
            expanded={expandedSections?.bookmarks ?? true}
            onToggle={() => toggleSection("bookmarks")}
          />
          {(expandedSections?.bookmarks ?? true) && (
            <div className="mt-1">
              <BookmarksList onSelect={handleNavigate} currentPath={currentPath || undefined} />
            </div>
          )}
        </div>

        <Separator className="my-1" />
        <div>
          <SectionHeader
            title="Диски"
            icon={<HardDrive className="h-4 w-4" />}
            expanded={expandedSections?.drives ?? true}
            onToggle={() => toggleSection("drives")}
          />
          {(expandedSections?.drives ?? true) && (
            <div className="mt-1 space-y-0.5">
              {drives.map((drive) => (
                <DriveItem
                  key={drive.path}
                  drive={drive}
                  isSelected={currentPath?.startsWith(drive.path) ?? false}
                  onSelect={() => handleNavigate(drive.path)}
                />
              ))}
            </div>
          )}
        </div>

        <Separator className="my-1" />
        <div>
          <SectionHeader
            title="Недавние"
            icon={<Clock className="h-4 w-4" />}
            expanded={expandedSections?.recent ?? true}
            onToggle={() => toggleSection("recent")}
          />
          {(expandedSections?.recent ?? true) && (
            <RecentFoldersList
              onSelect={handleNavigate}
              currentPath={currentPath || undefined}
              maxItems={8}
              className="mt-1"
            />
          )}
        </div>
      </div>
    </ScrollArea>
  )
}
