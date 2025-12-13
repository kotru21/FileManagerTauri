import { useCallback, useEffect, useRef } from "react";
import { commands, type SearchOptions } from "@/shared/api/tauri";
import { SEARCH } from "@/shared/config";
import { useTauriEvent } from "@/shared/lib/useTauriEvent";
import { toast, useToastStore } from "@/shared/ui";
import { type SearchProgress, useSearchStore } from "../model/store";

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
  const isMountedRef = useRef(true);
  const lastUpdateRef = useRef(0);
  const searchingToastRef = useRef<string | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const startSearch = useCallback(async () => {
    if (!searchPath || query.length < 2) return;

    abortRef.current = false;
    setIsSearching(true);
    setProgress({ scanned: 0, found: 0, currentPath: "" });
    setResults([]);

    // Show toast for search start
    searchingToastRef.current = toast.info(`Поиск "${query}"...`, 0);

    // Remove previous listener if any — managed by useTauriEvent

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

      // Remove search toast
      if (searchingToastRef.current) {
        useToastStore.getState().removeToast(searchingToastRef.current);
        searchingToastRef.current = null;
      }

      if (result.status === "ok" && !abortRef.current) {
        setResults(result.data);

        // Toast with results
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

      // Unlisten handled by useTauriEvent
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

  const cancelSearch = useCallback(
    (silent = false) => {
      abortRef.current = true;
      setIsSearching(false);
      setProgress(null);

      if (searchingToastRef.current) {
        useToastStore.getState().removeToast(searchingToastRef.current);
        searchingToastRef.current = null;
      }

      if (!silent) {
        toast.warning("Поиск отменён", 2000);
      }
    },
    [setIsSearching, setProgress]
  );

  // Register Tauri event listener for search-progress while searching
  useTauriEvent<SearchProgressEvent>(
    "search-progress",
    (payload) => {
      if (abortRef.current) return;
      const now = Date.now();
      if (now - lastUpdateRef.current < SEARCH.PROGRESS_THROTTLE_MS) return;
      lastUpdateRef.current = now;
      const prog: SearchProgress = {
        scanned: payload.scanned,
        found: payload.found,
        currentPath: payload.current_path,
      };
      setProgress(prog);
    },
    [setProgress],
    isSearching
  );

  return {
    startSearch,
    cancelSearch,
    isSearching,
    progress,
    results,
  };
}
