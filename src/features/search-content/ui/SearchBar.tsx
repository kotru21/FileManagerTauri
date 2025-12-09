import { useCallback, useState, useEffect } from "react";
import { Search, X, FileText, Loader2, StopCircle } from "lucide-react";
import { Input, Button } from "@/shared/ui";
import { cn } from "@/shared/lib";
import { useSearchStore } from "../model/store";
import { useSearchWithProgress } from "../hooks/useSearchWithProgress";

interface SearchBarProps {
  onSearch?: () => void;
  className?: string;
}

export function SearchBar({ onSearch, className }: SearchBarProps) {
  const { query, searchContent, setQuery, setSearchContent, reset } =
    useSearchStore();

  const { startSearch, cancelSearch, isSearching, progress } =
    useSearchWithProgress();

  const [input, setInput] = useState(query);

  // Debounce для автоматического поиска
  useEffect(() => {
    if (input.length < 2) return;
    
    const timer = setTimeout(() => {
      setQuery(input);
      startSearch();
    }, 500);

    return () => clearTimeout(timer);
  }, [input, setQuery, startSearch]);

  const handleChange = useCallback((value: string) => {
    setInput(value);
    if (value.length < 2) {
      reset();
    }
  }, [reset]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (input.length >= 2) {
        setQuery(input);
        startSearch();
        onSearch?.();
      }
    },
    [input, setQuery, startSearch, onSearch]
  );

  const handleClear = useCallback(() => {
    setInput("");
    cancelSearch();
    reset();
  }, [reset, cancelSearch]);

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
              Просканировано: <strong>{progress.scanned.toLocaleString()}</strong> файлов
            </span>
            <span>
              Найдено: <strong className="text-primary">{progress.found}</strong>
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
