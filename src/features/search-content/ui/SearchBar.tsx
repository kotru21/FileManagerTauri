import { useCallback } from "react";
import { Search, X, FileText } from "lucide-react";
import { Input, Button } from "@/shared/ui";
import { cn } from "@/shared/lib";
import { useSearchStore } from "../model/store";

interface SearchBarProps {
  onSearch?: () => void;
  className?: string;
}

export function SearchBar({ onSearch, className }: SearchBarProps) {
  const { query, searchContent, setQuery, setSearchContent, reset } =
    useSearchStore();

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      onSearch?.();
    },
    [onSearch]
  );

  const handleClear = useCallback(() => {
    reset();
  }, [reset]);

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("flex items-center gap-2", className)}>
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            searchContent ? "Поиск по содержимому..." : "Поиск файлов..."
          }
          className="pl-9 pr-8"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>

      <Button
        type="button"
        variant={searchContent ? "default" : "outline"}
        size="icon"
        onClick={() => setSearchContent(!searchContent)}
        title={searchContent ? "Поиск по содержимому" : "Поиск по имени"}>
        <FileText className="h-4 w-4" />
      </Button>
    </form>
  );
}
