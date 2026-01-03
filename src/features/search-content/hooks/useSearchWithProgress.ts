import { useCallback, useEffect, useRef } from "react"
import { usePerformanceSettings } from "@/entities/app-settings"
import type { SearchOptions, SearchResult } from "@/shared/api/tauri"
import { tauriEvents } from "@/shared/api/tauri"
import { tauriClient } from "@/shared/api/tauri/client"
import { toast } from "@/shared/ui"
import { useSearchStore } from "../model/store"

export function useSearchWithProgress() {
  const unlistenRefs = useRef<Array<() => void>>([])
  const lastUpdateRef = useRef<number>(0)
  const pendingResultsRef = useRef<SearchResult[]>([])
  const flushTimeoutRef = useRef<number | null>(null)

  // Cleanup listener on unmount
  useEffect(() => {
    return () => {
      for (const unlisten of unlistenRefs.current) {
        unlisten()
      }
      unlistenRefs.current = []

      if (flushTimeoutRef.current !== null) {
        window.clearTimeout(flushTimeoutRef.current)
        flushTimeoutRef.current = null
      }
    }
  }, [])

  const performance = usePerformanceSettings()

  const search = useCallback(async () => {
    // IMPORTANT: read fresh state at call time.
    // This avoids the "second click" bug when callers do setQuery(...); search() in the same tick.
    const {
      query,
      searchPath,
      searchContent,
      caseSensitive,
      setIsSearching,
      setResults,
      appendResults,
      setProgress,
    } = useSearchStore.getState()

    if (!query.trim() || !searchPath) {
      return
    }

    // Remove previous listener
    for (const unlisten of unlistenRefs.current) {
      unlisten()
    }
    unlistenRefs.current = []

    if (flushTimeoutRef.current !== null) {
      window.clearTimeout(flushTimeoutRef.current)
      flushTimeoutRef.current = null
    }
    pendingResultsRef.current = []

    setIsSearching(true)
    setProgress({ scanned: 0, found: 0, currentPath: searchPath })
    setResults([])

    try {
      // Subscribe to progress events with throttle
      const unlistenProgress = await tauriEvents.searchProgress((event) => {
        if (useSearchStore.getState().shouldCancel) {
          return
        }
        const now = Date.now()
        // Throttle: update UI at most once every 100ms
        if (now - lastUpdateRef.current > 100) {
          lastUpdateRef.current = now
          setProgress({
            scanned: event.payload.scanned,
            found: event.payload.found,
            currentPath: event.payload.current_path,
          })
        }
      })

      const unlistenBatch = await tauriEvents.searchBatch((event) => {
        if (useSearchStore.getState().shouldCancel) {
          return
        }

        pendingResultsRef.current.push(...event.payload)

        // Soft-throttle UI updates for results to avoid too many re-renders.
        if (flushTimeoutRef.current === null) {
          flushTimeoutRef.current = window.setTimeout(() => {
            const pending = pendingResultsRef.current
            if (pending.length > 0) {
              pendingResultsRef.current = []
              appendResults(pending)
            }
            flushTimeoutRef.current = null
          }, 75)
        }
      })

      unlistenRefs.current.push(unlistenProgress, unlistenBatch)

      const options: SearchOptions = {
        query: query.trim(),
        search_path: searchPath,
        search_content: searchContent,
        case_sensitive: caseSensitive,
        max_results: performance.maxSearchResults,
        file_extensions: null,
      }

      const files = await tauriClient.searchFilesStream(options)

      if (!useSearchStore.getState().shouldCancel) {
        // Ensure final list is consistent with backend (e.g., if some batches were throttled).
        setResults(files)
        toast.success(`Найдено ${files.length} файлов`)
      }
    } catch (error) {
      toast.error(`Ошибка поиска: ${String(error)}`)
    } finally {
      setIsSearching(false)
      setProgress(null)

      // Clear listener
      for (const unlisten of unlistenRefs.current) {
        unlisten()
      }
      unlistenRefs.current = []

      if (flushTimeoutRef.current !== null) {
        window.clearTimeout(flushTimeoutRef.current)
        flushTimeoutRef.current = null
      }
      pendingResultsRef.current = []
    }
  }, [performance.maxSearchResults])

  return { search }
}
