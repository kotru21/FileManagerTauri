import { useQueryClient } from "@tanstack/react-query"
import { listen, type UnlistenFn } from "@tauri-apps/api/event"
import { useCallback, useEffect, useRef } from "react"
import { commands } from "@/shared/api/tauri"
import { fileKeys } from "./queries"

interface FsChangeEvent {
  kind: string
  paths: string[]
}

export function useFileWatcher(currentPath: string | null) {
  const queryClient = useQueryClient()
  const unlistenRef = useRef<UnlistenFn | null>(null)
  const currentPathRef = useRef<string | null>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const invalidateDirectoryQueries = useCallback(() => {
    const path = currentPathRef.current
    if (path) {
      queryClient.invalidateQueries({ queryKey: fileKeys.directory(path) })
    }
  }, [queryClient])
  const debouncedInvalidate = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    debounceTimerRef.current = setTimeout(() => {
      invalidateDirectoryQueries()
    }, 300)
  }, [invalidateDirectoryQueries])

  useEffect(() => {
    if (!currentPath) {
      if (currentPathRef.current) {
        commands.unwatchDirectory(currentPathRef.current).catch(() => {})
      }
      currentPathRef.current = null
      return
    }
    if (currentPathRef.current === currentPath) {
      return
    }

    const setupWatcher = async () => {
      if (currentPathRef.current) {
        try {
          await commands.unwatchDirectory(currentPathRef.current)
        } catch {
          void 0
        }
      }
      if (unlistenRef.current) {
        unlistenRef.current()
        unlistenRef.current = null
      }

      currentPathRef.current = currentPath
      unlistenRef.current = await listen<FsChangeEvent>("fs-change", (event) => {
        const { kind, paths } = event.payload
        if (kind.includes("Access")) {
          return
        }
        const isRelevant = paths.some((changedPath) => {
          const normalizedChanged = changedPath.replace(/\\/g, "/")
          const normalizedCurrent = currentPath.replace(/\\/g, "/")
          const changedDir = normalizedChanged.substring(0, normalizedChanged.lastIndexOf("/"))
          return changedDir === normalizedCurrent || normalizedChanged === normalizedCurrent
        })

        if (isRelevant) {
          debouncedInvalidate()
        }
      })
      try {
        await commands.watchDirectory(currentPath)
      } catch (error) {
        console.error("Failed to watch directory:", error)
      }
    }

    setupWatcher()
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      if (unlistenRef.current) {
        unlistenRef.current()
        unlistenRef.current = null
      }
      if (currentPathRef.current) {
        commands.unwatchDirectory(currentPathRef.current).catch(() => {})
        currentPathRef.current = null
      }
    }
  }, [currentPath, debouncedInvalidate])

  const refresh = useCallback(() => {
    invalidateDirectoryQueries()
  }, [invalidateDirectoryQueries])

  return { refresh }
}
