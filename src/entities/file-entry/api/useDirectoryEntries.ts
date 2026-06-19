import { matchQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback, useEffect } from "react"
import { fileKeys } from "./keys"
import { useStreamingDirectory } from "./useStreamingDirectory"

export function useDirectoryEntries(path: string | null) {
  const queryClient = useQueryClient()
  const stream = useStreamingDirectory(path)

  useEffect(() => {
    if (!path || !stream.isComplete) return
    queryClient.setQueryData(fileKeys.directory(path), stream.entries)
  }, [path, stream.isComplete, stream.entries, queryClient])

  useEffect(() => {
    if (!path) return

    const directoryKey = fileKeys.directory(path)
    return queryClient.getQueryCache().subscribe((event) => {
      if (event.type !== "updated" || event.action.type !== "invalidate") return
      if (matchQuery({ queryKey: directoryKey }, event.query)) {
        stream.refresh()
      }
    })
  }, [path, queryClient, stream.refresh])

  const refetch = useCallback(async () => {
    if (path) {
      await queryClient.invalidateQueries({ queryKey: fileKeys.directory(path) })
    }
  }, [path, queryClient])

  return {
    files: stream.entries,
    isLoading: stream.isLoading,
    error: stream.error,
    refetch,
  }
}
