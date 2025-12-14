import { FileText, Loader2, Search, StopCircle, X } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { SEARCH } from "@/shared/config"
import { cn } from "@/shared/lib"
import { Button, Input } from "@/shared/ui"
import { useSearchWithProgress } from "../hooks/useSearchWithProgress"
import { useSearchStore } from "../model/store"

interface SearchBarProps {
  onSearch?: () => void
  className?: string
}

export function SearchBar({ onSearch, className }: SearchBarProps) {
  const { query, searchContent, setQuery, setSearchContent, clearSearch } = useSearchStore()

  const { startSearch, cancelSearch, isSearching, progress } = useSearchWithProgress()

  const [input, setInput] = useState(query)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Flag to prevent auto-search after clearing
  const skipNextSearch = useRef(false)

  // Sync input with query from the store (when query is cleared externally)
  useEffect(() => {
    if (query === "" && input !== "") {
      // Schedule the input reset to avoid synchronous setState in effect
      const id = setTimeout(() => {
        setInput("")
        skipNextSearch.current = true
      }, 0)
      return () => clearTimeout(id)
    }
    return
  }, [query, input])

  // Debounce for auto-search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }

    if (skipNextSearch.current) {
      skipNextSearch.current = false
      return
    }

    if (input.length < SEARCH.MIN_QUERY_LENGTH) return

    debounceRef.current = setTimeout(() => {
      setQuery(input)
      startSearch()
    }, 500)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [input, setQuery, startSearch])

  const handleChange = useCallback(
    (value: string) => {
      setInput(value)
      if (value.length < SEARCH.MIN_QUERY_LENGTH) {
        clearSearch()
      }
    },
    [clearSearch],
  )

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (input.length >= SEARCH.MIN_QUERY_LENGTH) {
        if (debounceRef.current) {
          clearTimeout(debounceRef.current)
          debounceRef.current = null
        }
        setQuery(input)
        startSearch()
        onSearch?.()
      }
    },
    [input, setQuery, startSearch, onSearch],
  )

  const handleClear = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    skipNextSearch.current = true
    setInput("")
    cancelSearch(true)
    clearSearch()
  }, [clearSearch, cancelSearch])

  const handleCancel = useCallback(() => {
    cancelSearch()
  }, [cancelSearch])

  // Shorten path for display
  const shortPath = progress?.currentPath
    ? progress.currentPath.length > 50
      ? `...${progress.currentPath.slice(-47)}`
      : progress.currentPath
    : ""

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={input}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={searchContent ? "Поиск по содержимому..." : "Поиск файлов..."}
            aria-label="Поиск файлов"
            aria-describedby={isSearching ? "search-progress" : undefined}
            className="pl-9 pr-8"
            disabled={isSearching}
          />
          {isSearching && (
            <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
          )}
          {input && !isSearching && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

        {isSearching ? (
          <Button
            type="button"
            variant="destructive"
            size="icon"
            onClick={handleCancel}
            title="Отменить поиск"
          >
            <StopCircle className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            variant={searchContent ? "default" : "outline"}
            size="icon"
            onClick={() => setSearchContent(!searchContent)}
            title={searchContent ? "Поиск по содержимому" : "Поиск по имени"}
          >
            <FileText className="h-4 w-4" />
          </Button>
        )}
      </form>

      {/* Search progress indicator */}
      {isSearching && progress && (
        <div className="flex flex-col gap-0.5 text-xs text-muted-foreground px-1 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <span>
              Просканировано: <strong>{progress.scanned.toLocaleString()}</strong> файлов
            </span>
            <span>
              Найдено: <strong className="text-primary">{progress.found}</strong>
            </span>
          </div>
          {shortPath && (
            <output
              id="search-progress"
              aria-live="polite"
              className="truncate opacity-70"
              title={progress.currentPath}
            >
              {shortPath}
            </output>
          )}
        </div>
      )}
    </div>
  )
}
