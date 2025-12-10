import { useCallback, useState, useEffect, useRef } from "react";
import { Search, X, FileText, Loader2, StopCircle } from "lucide-react";
import { Input, Button } from "@/shared/ui";
import { cn } from "@/shared/lib";
import { useSearchStore } from "../model/store";
import { useSearchWithProgress } from "../hooks/useSearchWithProgress";
import { SEARCH } from "@/shared/config";

interface SearchBarProps {
  onSearch?: () => void;
  className?: string;
}

export function SearchBar({ onSearch, className }: SearchBarProps) {
  const { query, searchContent, setQuery, setSearchContent, clearSearch } =
    useSearchStore();

  const { startSearch, cancelSearch, isSearching, progress } =
    useSearchWithProgress();

  const [input, setInput] = useState(query);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Флаг для предотвращения автопоиска после очистки
  const skipNextSearch = useRef(false);

  // Синхронизируем input с query из store (когда query очищается извне)
  useEffect(() => {
    if (query === "" && input !== "") {
      setInput("");
      skipNextSearch.current = true;
    }
  }, [query, input]);

  // Debounce для автоматического поиска
  useEffect(() => {
    // Очищаем предыдущий таймер
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    // Пропускаем поиск если установлен флаг
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }

    if (input.length < SEARCH.MIN_QUERY_LENGTH) return;

    debounceRef.current = setTimeout(() => {
      setQuery(input);
      startSearch();
    }, 500);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [input, setQuery, startSearch]);

  const handleChange = useCallback(
    (value: string) => {
      setInput(value);
      if (value.length < SEARCH.MIN_QUERY_LENGTH) {
        clearSearch();
      }
    },
    [clearSearch]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (input.length >= SEARCH.MIN_QUERY_LENGTH) {
        // Отменяем debounce таймер
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
          debounceRef.current = null;
        }
        setQuery(input);
        startSearch();
        onSearch?.();
      }
    },
    [input, setQuery, startSearch, onSearch]
  );

  const handleClear = useCallback(() => {
    // Отменяем debounce таймер
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    skipNextSearch.current = true;
    setInput("");
    cancelSearch(true); // Тихая отмена без toast
    clearSearch();
  }, [clearSearch, cancelSearch]);

  const handleCancel = useCallback(() => {
    cancelSearch();
  }, [cancelSearch]);

  // Сокращаем путь для отображения
  const shortPath = progress?.currentPath
    ? progress.currentPath.length > 50
      ? "..." + progress.currentPath.slice(-47)
      : progress.currentPath
    : "";

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={input}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={
              searchContent ? "Поиск по содержимому..." : "Поиск файлов..."
            }
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
              className="absolute right-3 top-1/2 -translate-y-1/2">
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
            title="Отменить поиск">
            <StopCircle className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            variant={searchContent ? "default" : "outline"}
            size="icon"
            onClick={() => setSearchContent(!searchContent)}
            title={searchContent ? "Поиск по содержимому" : "Поиск по имени"}>
            <FileText className="h-4 w-4" />
          </Button>
        )}
      </form>

      {/* Индикатор прогресса поиска */}
      {isSearching && progress && (
        <div className="flex flex-col gap-0.5 text-xs text-muted-foreground px-1 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <span>
              Просканировано:{" "}
              <strong>{progress.scanned.toLocaleString()}</strong> файлов
            </span>
            <span>
              Найдено:{" "}
              <strong className="text-primary">{progress.found}</strong>
            </span>
          </div>
          {shortPath && (
            <div className="truncate opacity-70" title={progress.currentPath}>
              {shortPath}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
