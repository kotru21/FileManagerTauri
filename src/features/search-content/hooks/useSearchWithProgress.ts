import { listen } from "@tauri-apps/api/event"
import { useCallback, useEffect, useRef } from "react"
import { usePerformanceSettings } from "@/features/settings"
import type { SearchOptions } from "@/shared/api/tauri"
import { tauriClient } from "@/shared/api/tauri/client"
import { toast } from "@/shared/ui"
import { useSearchStore } from "../model/store"

interface SearchProgressEvent {
  scanned: number
  found: number
  current_path: string
}

export function useSearchWithProgress() {
  const unlistenRef = useRef<(() => void) | null>(null)
  const lastUpdateRef = useRef<number>(0)

  const {
    query,
    searchPath,
    searchContent,
    caseSensitive,
    setIsSearching,
    setResults,
    setProgress,
  } = useSearchStore()

  // Cleanup listener on unmount
  useEffect(() => {
    return () => {
      if (unlistenRef.current) {
        unlistenRef.current()
        unlistenRef.current = null
      }
    }
  }, [])

  const performance = usePerformanceSettings()

  const search = useCallback(async () => {
    if (!query.trim() || !searchPath) {
      return
    }

    // Remove previous listener
    if (unlistenRef.current) {
      unlistenRef.current()
      unlistenRef.current = null
    }

    setIsSearching(true)
    setProgress({ scanned: 0, found: 0, currentPath: searchPath })
    setResults([])

    try {
      // Subscribe to progress events with throttle
      unlistenRef.current = await listen<SearchProgressEvent>("search-progress", (event) => {
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

      const options: SearchOptions = {
        query: query.trim(),
        search_path: searchPath,
        search_content: searchContent,
        case_sensitive: caseSensitive,
        max_results: performance.maxSearchResults,
        file_extensions: null,
      }

      const files = await tauriClient.searchFilesStream(options)

      setResults(files)
      toast.success(`Найдено ${files.length} файлов`)
    } catch (error) {
      toast.error(`Ошибка поиска: ${String(error)}`)
    } finally {
      setIsSearching(false)
      setProgress(null)

      // Clear listener
      if (unlistenRef.current) {
        unlistenRef.current()
        unlistenRef.current = null
      }
    }
  }, [
    query,
    searchPath,
    searchContent,
    caseSensitive,
    setIsSearching,
    setResults,
    setProgress,
    performance.maxSearchResults,
  ])

  return { search }
}
