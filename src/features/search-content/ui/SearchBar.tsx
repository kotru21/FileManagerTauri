import { FileText, Loader2, Search, StopCircle, X } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigationStore } from "@/features/navigation"
import { cn } from "@/shared/lib"
import { Button, Input } from "@/shared/ui"
import { useSearchWithProgress } from "../hooks/useSearchWithProgress"
import { useSearchStore } from "../model/store"

interface SearchBarProps {
  onSearch?: () => void
  className?: string
}

export function SearchBar({ onSearch, className }: SearchBarProps) {
  const [localQuery, setLocalQuery] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const {
    query,
    searchContent,
    isSearching,
    progress,
    setQuery,
    setSearchPath,
    setSearchContent,
    cancelSearch,
    reset,
  } = useSearchStore()

  const { currentPath } = useNavigationStore()
  const { search } = useSearchWithProgress()

  // Синхронизируем searchPath с currentPath
  useEffect(() => {
    if (currentPath) {
      setSearchPath(currentPath)
    }
  }, [currentPath, setSearchPath])

  // Синхронизируем localQuery с query из store
  useEffect(() => {
    setLocalQuery(query)
  }, [query])

  const handleSearch = useCallback(() => {
    if (!localQuery.trim() || !currentPath) return

    setQuery(localQuery.trim())
    search()
    onSearch?.()
  }, [localQuery, currentPath, setQuery, search, onSearch])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault()
        handleSearch()
      } else if (e.key === "Escape") {
        setLocalQuery("")
        reset()
        inputRef.current?.blur()
      }
    },
    [handleSearch, reset],
  )

  const handleClear = useCallback(() => {
    setLocalQuery("")
    reset()
    inputRef.current?.focus()
  }, [reset])

  const handleCancel = useCallback(() => {
    cancelSearch()
  }, [cancelSearch])

  // Сокращаем путь для отображения
  const shortenPath = (path: string, maxLength: number = 30) => {
    if (path.length <= maxLength) return path
    const parts = path.split(/[/\\]/)
    if (parts.length <= 2) return path
    return `${parts[0]}\\...\\${parts[parts.length - 1]}`
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            ref={inputRef}
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={currentPath ? "Поиск файлов..." : "Выберите папку для поиска"}
            disabled={!currentPath}
            className="pl-9 pr-9 border-0 bg-muted/50 focus:bg-muted"
          />
          {localQuery && !isSearching && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSearchContent(!searchContent)}
          className={cn("shrink-0", searchContent && "bg-primary/20 text-primary")}
          title={searchContent ? "Поиск по содержимому (вкл)" : "Поиск по содержимому (выкл)"}
        >
          <FileText className="h-4 w-4" />
        </Button>

        {isSearching ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCancel}
            className="shrink-0 text-destructive hover:text-destructive"
            title="Остановить поиск"
          >
            <StopCircle className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSearch}
            disabled={!localQuery.trim() || !currentPath}
            className="shrink-0"
            title="Начать поиск"
          >
            <Search className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Индикатор прогресса поиска */}
      {isSearching && progress && (
        <div className="text-xs text-muted-foreground px-1">
          <span>Найдено: {progress.found}</span>
          <span className="mx-2">•</span>
          <span>Просканировано: {progress.scanned}</span>
          <span className="mx-2">•</span>
          <span className="truncate">{shortenPath(progress.currentPath)}</span>
        </div>
      )}
    </div>
  )
}
