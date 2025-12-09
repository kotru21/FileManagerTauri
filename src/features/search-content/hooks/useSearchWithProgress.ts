import { useCallback, useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { commands, type SearchOptions } from "@/shared/api/tauri";
import { useSearchStore, type SearchProgress } from "../model/store";
import { toast, useToastStore } from "@/shared/ui";

interface SearchProgressEvent {
  scanned: number;
  found: number;
  current_path: string;
}

export function useSearchWithProgress() {
  const {
    searchPath,
    query,
    searchContent,
    caseSensitive,
    isSearching,
    progress,
    results,
    setIsSearching,
    setProgress,
    setResults,
  } = useSearchStore();

  const abortRef = useRef(false);
  const unlistenRef = useRef<(() => void) | null>(null);
  const lastUpdateRef = useRef(0);
  const searchingToastRef = useRef<string | null>(null);

  // Очистка слушателя при размонтировании
  useEffect(() => {
    return () => {
      if (unlistenRef.current) {
        unlistenRef.current();
        unlistenRef.current = null;
      }
    };
  }, []);

  const startSearch = useCallback(async () => {
    if (!searchPath || query.length < 2) return;

    abortRef.current = false;
    setIsSearching(true);
    setProgress({ scanned: 0, found: 0, currentPath: "" });
    setResults([]);

    // Показываем toast о начале поиска
    searchingToastRef.current = toast.info(`Поиск "${query}"...`, 0);

    // Удаляем предыдущий слушатель
    if (unlistenRef.current) {
      unlistenRef.current();
    }

    // Подписываемся на события прогресса с throttle
    unlistenRef.current = await listen<SearchProgressEvent>(
      "search-progress",
      (event) => {
        if (abortRef.current) return;

        // Throttle: обновляем UI максимум раз в 200ms
        const now = Date.now();
        if (now - lastUpdateRef.current < 200) return;
        lastUpdateRef.current = now;

        const prog: SearchProgress = {
          scanned: event.payload.scanned,
          found: event.payload.found,
          currentPath: event.payload.current_path,
        };
        setProgress(prog);
      }
    );

    try {
      const options: SearchOptions = {
        query,
        search_path: searchPath,
        search_content: searchContent,
        case_sensitive: caseSensitive,
        max_results: 1000,
        file_extensions: null,
      };

      const result = await commands.searchFilesStream(options);

      // Удаляем toast о поиске
      if (searchingToastRef.current) {
        useToastStore.getState().removeToast(searchingToastRef.current);
        searchingToastRef.current = null;
      }

      if (result.status === "ok" && !abortRef.current) {
        setResults(result.data);

        // Показываем toast с результатом
        if (result.data.length === 0) {
          toast.info("Ничего не найдено", 3000);
        } else {
          toast.success(`Найдено ${result.data.length} результатов`, 2000);
        }
      } else if (result.status === "error") {
        console.error("Search error:", result.error);
        toast.error("Ошибка поиска", 3000);
      }
    } catch (error) {
      console.error("Search failed:", error);
      toast.error("Ошибка поиска", 3000);

      if (searchingToastRef.current) {
        useToastStore.getState().removeToast(searchingToastRef.current);
        searchingToastRef.current = null;
      }
    } finally {
      setIsSearching(false);
      setProgress(null);

      if (unlistenRef.current) {
        unlistenRef.current();
        unlistenRef.current = null;
      }
    }
  }, [
    searchPath,
    query,
    searchContent,
    caseSensitive,
    setIsSearching,
    setProgress,
    setResults,
  ]);

  const cancelSearch = useCallback(() => {
    abortRef.current = true;
    setIsSearching(false);
    setProgress(null);

    if (searchingToastRef.current) {
      useToastStore.getState().removeToast(searchingToastRef.current);
      searchingToastRef.current = null;
    }
    toast.warning("Поиск отменён", 2000);
  }, [setIsSearching, setProgress]);

  return {
    startSearch,
    cancelSearch,
    isSearching,
    progress,
    results,
  };
}
