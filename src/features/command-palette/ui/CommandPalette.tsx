import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Clipboard,
  Copy,
  Eye,
  EyeOff,
  File,
  FilePlus,
  Folder,
  FolderPlus,
  Grid,
  List,
  RefreshCw,
  Scissors,
  Search,
  Settings,
  Star,
  Trash2,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useRef } from "react"
import { cn } from "@/shared/lib"
import { Dialog, DialogContent, Input } from "@/shared/ui"
import { type Command, useCommandPaletteStore } from "../model/store"

const CATEGORY_LABELS: Record<Command["category"], string> = {
  navigation: "Навигация",
  file: "Файлы",
  edit: "Редактирование",
  view: "Вид",
  search: "Поиск",
  other: "Другое",
}

const CATEGORY_ORDER: Command["category"][] = [
  "navigation",
  "file",
  "edit",
  "view",
  "search",
  "other",
]

const ICON_MAP: Record<string, React.ReactNode> = {
  "arrow-left": <ArrowLeft className="h-4 w-4" />,
  "arrow-right": <ArrowRight className="h-4 w-4" />,
  "arrow-up": <ArrowUp className="h-4 w-4" />,
  "arrow-down": <ArrowDown className="h-4 w-4" />,
  folder: <Folder className="h-4 w-4" />,
  "folder-plus": <FolderPlus className="h-4 w-4" />,
  file: <File className="h-4 w-4" />,
  "file-plus": <FilePlus className="h-4 w-4" />,
  copy: <Copy className="h-4 w-4" />,
  scissors: <Scissors className="h-4 w-4" />,
  clipboard: <Clipboard className="h-4 w-4" />,
  trash: <Trash2 className="h-4 w-4" />,
  refresh: <RefreshCw className="h-4 w-4" />,
  search: <Search className="h-4 w-4" />,
  star: <Star className="h-4 w-4" />,
  eye: <Eye className="h-4 w-4" />,
  "eye-off": <EyeOff className="h-4 w-4" />,
  grid: <Grid className="h-4 w-4" />,
  list: <List className="h-4 w-4" />,
  settings: <Settings className="h-4 w-4" />,
}

export function CommandPalette() {
  const { isOpen, search, selectedIndex, close, setSearch, setSelectedIndex, executeCommand } =
    useCommandPaletteStore()

  const commands = useCommandPaletteStore((s) => s.commands)

  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Memoize filtered commands
  const filteredCommands = useMemo(() => {
    if (!search) return commands

    const lowerSearch = search.toLowerCase()
    return commands
      .filter((cmd) => {
        const titleMatch = cmd.title.toLowerCase().includes(lowerSearch)
        const descMatch = cmd.description?.toLowerCase().includes(lowerSearch)
        const keywordsMatch = cmd.keywords?.some((k) => k.toLowerCase().includes(lowerSearch))
        return titleMatch || descMatch || keywordsMatch
      })
      .sort((a, b) => {
        const aTitle = a.title.toLowerCase().startsWith(lowerSearch)
        const bTitle = b.title.toLowerCase().startsWith(lowerSearch)
        if (aTitle && !bTitle) return -1
        if (!aTitle && bTitle) return 1
        return 0
      })
  }, [commands, search])

  // Group commands by category
  const groupedCommands = CATEGORY_ORDER.reduce(
    (acc, category) => {
      const commands = filteredCommands.filter((c) => c.category === category)
      if (commands.length > 0) {
        acc.push({ category, commands })
      }
      return acc
    },
    [] as { category: Command["category"]; commands: Command[] }[],
  )

  // Flatten for index calculation
  const flatCommands = groupedCommands.flatMap((g) => g.commands)

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && flatCommands.length > 0) {
      const selectedElement = listRef.current.querySelector(`[data-index="${selectedIndex}"]`)
      selectedElement?.scrollIntoView({ block: "nearest" })
    }
  }, [selectedIndex, flatCommands.length])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault()
          setSelectedIndex((selectedIndex + 1) % flatCommands.length)
          break
        case "ArrowUp":
          e.preventDefault()
          setSelectedIndex((selectedIndex - 1 + flatCommands.length) % flatCommands.length)
          break
        case "Enter":
          e.preventDefault()
          if (flatCommands[selectedIndex]) {
            executeCommand(flatCommands[selectedIndex].id)
          }
          break
        case "Escape":
          e.preventDefault()
          close()
          break
      }
    },
    [selectedIndex, flatCommands, setSelectedIndex, executeCommand, close],
  )

  // Global keyboard shortcut
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        useCommandPaletteStore.getState().toggle()
      }
    }

    window.addEventListener("keydown", handleGlobalKeyDown)
    return () => window.removeEventListener("keydown", handleGlobalKeyDown)
  }, [])

  let globalIndex = 0

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent className="p-0 max-w-lg overflow-hidden">
        <div className="flex flex-col">
          {/* Search input */}
          <div className="flex items-center border-b px-3">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Введите команду..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-12"
            />
          </div>

          {/* Commands list */}
          <div ref={listRef} className="max-h-80 overflow-auto py-2">
            {groupedCommands.length === 0 ? (
              <div className="px-4 py-8 text-center text-muted-foreground">Команды не найдены</div>
            ) : (
              groupedCommands.map(({ category, commands }) => (
                <div key={category}>
                  <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {CATEGORY_LABELS[category]}
                  </div>
                  {commands.map((command) => {
                    const index = globalIndex++
                    return (
                      <button
                        key={command.id}
                        type="button"
                        data-index={index}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 text-sm text-left",
                          "hover:bg-accent transition-colors",
                          index === selectedIndex && "bg-accent",
                        )}
                        onClick={() => executeCommand(command.id)}
                        onMouseEnter={() => setSelectedIndex(index)}
                      >
                        <span className="text-muted-foreground shrink-0">
                          {command.icon && ICON_MAP[command.icon]}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="truncate">{command.title}</div>
                          {command.description && (
                            <div className="text-xs text-muted-foreground truncate">
                              {command.description}
                            </div>
                          )}
                        </div>
                        {command.shortcut && (
                          <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-xs text-muted-foreground">
                            {command.shortcut}
                          </kbd>
                        )}
                      </button>
                    )
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <kbd className="rounded border bg-muted px-1">↑↓</kbd>
              <span>навигация</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="rounded border bg-muted px-1">Enter</kbd>
              <span>выполнить</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="rounded border bg-muted px-1">Esc</kbd>
              <span>закрыть</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
