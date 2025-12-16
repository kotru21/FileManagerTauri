import { homeDir } from "@tauri-apps/api/path"
import { Folder, HardDrive, Star } from "lucide-react"
import { useEffect, useState } from "react"
import { DriveItem } from "@/entities/drive"
import { useDrives } from "@/entities/file-entry"
import { BookmarksList, useBookmarksStore } from "@/features/bookmarks"
import { useNavigationStore } from "@/features/navigation"
import { cn } from "@/shared/lib"
import { ScrollArea, Separator } from "@/shared/ui"

interface SidebarProps {
  className?: string
  collapsed?: boolean
}

type SidebarSection = "bookmarks" | "drives" | "quickAccess"

export function Sidebar({ className, collapsed }: SidebarProps) {
  const { currentPath, navigate } = useNavigationStore()
  const { data: drives } = useDrives()
  const { addBookmark } = useBookmarksStore()
  const [expandedSections, setExpandedSections] = useState<Set<SidebarSection>>(
    new Set(["bookmarks", "drives", "quickAccess"]),
  )

  const toggleSection = (section: SidebarSection) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    try {
      const data = e.dataTransfer.getData("application/json")
      const { paths } = JSON.parse(data)
      if (Array.isArray(paths) && paths.length > 0) {
        // Add first dropped path as bookmark
        addBookmark(paths[0])
      }
    } catch {
      // Ignore parse errors
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "link"
  }

  const [homePath, setHomePath] = useState<string | null>(null)

  useEffect(() => {
    // Try to resolve home via Tauri API
    let mounted = true
    ;(async () => {
      try {
        const h = await homeDir()
        if (mounted && h) setHomePath(h)
      } catch {
        // ignore
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const resolveHome = () => {
    if (homePath) return homePath
    if (currentPath) {
      // Try to derive from current path (Windows: C:\Users\User\..., Unix: /home/user/...)
      const win = currentPath.match(/^([A-Za-z]:\\Users\\[^\\/]+)/)
      if (win) return win[1]
      const unix = currentPath.match(/^(\/home\/[^/]+)/)
      if (unix) return unix[1]
    }

    // Fallbacks
    if (typeof navigator !== "undefined" && navigator.userAgent.includes("Windows")) {
      return "C:\\Users\\User"
    }
    return "/home/user"
  }

  const quickAccessPaths = [
    {
      name: "Рабочий стол",
      path: `${resolveHome()}${typeof navigator !== "undefined" && navigator.userAgent.includes("Windows") ? "\\Desktop" : "/Desktop"}`,
    },
    {
      name: "Документы",
      path: `${resolveHome()}${typeof navigator !== "undefined" && navigator.userAgent.includes("Windows") ? "\\Documents" : "/Documents"}`,
    },
    {
      name: "Загрузки",
      path: `${resolveHome()}${typeof navigator !== "undefined" && navigator.userAgent.includes("Windows") ? "\\Downloads" : "/Downloads"}`,
    },
  ].filter((item) => item.path)

  return (
    <div className={cn("flex flex-col h-full bg-muted/30", className)}>
      <ScrollArea className="flex-1">
        <div className={cn("p-2", collapsed && "items-center")}>
          {/* Bookmarks */}
          <SidebarSectionHeader
            icon={Star}
            title="Избранное"
            expanded={expandedSections.has("bookmarks")}
            onToggle={() => toggleSection("bookmarks")}
            collapsed={collapsed}
          />

          {collapsed ? (
            // compact icon list for bookmarks (first few)
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="min-h-15 flex flex-col items-center gap-1 py-2"
            >
              {/* show up to 6 bookmark icons */}
              {useBookmarksStore
                .getState()
                .bookmarks.slice(0, 6)
                .map((bm) => (
                  <button
                    key={bm.id}
                    title={bm.name}
                    type="button"
                    onClick={() => navigate(bm.path)}
                    className="rounded p-1 hover:bg-accent/50"
                  >
                    <Folder className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
            </div>
          ) : (
            expandedSections.has("bookmarks") && (
              <div onDrop={handleDrop} onDragOver={handleDragOver} className="min-h-15">
                <BookmarksList onSelect={navigate} currentPath={currentPath || undefined} />
              </div>
            )
          )}

          <Separator className="my-2" />

          {/* Quick Access */}
          <SidebarSectionHeader
            icon={Folder}
            title="Быстрый доступ"
            expanded={expandedSections.has("quickAccess")}
            onToggle={() => toggleSection("quickAccess")}
            collapsed={collapsed}
          />

          {collapsed ? (
            <div className="flex flex-col items-center gap-2 py-2">
              {quickAccessPaths.slice(0, 6).map((item) => (
                <button
                  type="button"
                  key={item.path}
                  title={item.name}
                  onClick={() => item.path && navigate(item.path)}
                  className="rounded p-1 hover:bg-accent/50"
                >
                  <Folder className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          ) : (
            expandedSections.has("quickAccess") && (
              <div className="space-y-0.5 p-2">
                {quickAccessPaths.map((item) => (
                  <button
                    type="button"
                    key={item.path}
                    onClick={() => item.path && navigate(item.path)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      currentPath === item.path && "bg-accent text-accent-foreground",
                    )}
                  >
                    <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{item.name}</span>
                  </button>
                ))}
              </div>
            )
          )}

          <Separator className="my-2" />

          {/* Drives */}
          <SidebarSectionHeader
            icon={HardDrive}
            title="Диски"
            expanded={expandedSections.has("drives")}
            onToggle={() => toggleSection("drives")}
            collapsed={collapsed}
          />

          {collapsed ? (
            <div className="flex flex-col items-center gap-2 py-2">
              {drives?.slice(0, 10).map((drive) => (
                <button
                  type="button"
                  key={drive.path}
                  title={drive.name}
                  onClick={() => navigate(drive.path)}
                  className={cn(
                    "rounded p-1 hover:bg-accent/50",
                    currentPath?.startsWith(drive.path) && "bg-accent",
                  )}
                >
                  <HardDrive className="h-4 w-4 text-blue-500" />
                </button>
              ))}
            </div>
          ) : (
            expandedSections.has("drives") && (
              <div className="space-y-1 p-2">
                {drives?.map((drive) => (
                  <DriveItem
                    key={drive.path}
                    drive={drive}
                    isSelected={currentPath?.startsWith(drive.path) || false}
                    onSelect={() => navigate(drive.path)}
                  />
                ))}
              </div>
            )
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

interface SidebarSectionHeaderProps {
  icon: React.ComponentType<{ className?: string }>
  title: string
  expanded: boolean
  onToggle: () => void
  collapsed?: boolean
}

function SidebarSectionHeader({
  icon: Icon,
  title,
  expanded,
  onToggle,
  collapsed,
}: SidebarSectionHeaderProps) {
  if (collapsed) {
    return (
      <button
        type="button"
        onClick={onToggle}
        title={title}
        className="rounded-md p-2 hover:bg-accent/50"
      >
        <Icon className="h-4 w-4 text-muted-foreground" />
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
    >
      <Icon className="h-4 w-4" />
      <span className="flex-1 text-left">{title}</span>
      <span className={cn("text-xs transition-transform", expanded ? "rotate-0" : "-rotate-90")}>
        ▼
      </span>
    </button>
  )
}
