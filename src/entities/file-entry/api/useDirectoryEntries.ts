import { useQueryClient } from "@tanstack/react-query"
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

  const refetch = useCallback(async () => {
    stream.refresh()
    if (path) {
      await queryClient.invalidateQueries({ queryKey: fileKeys.directory(path) })
    }
  }, [path, queryClient, stream.refresh])

  return {
    files: stream.entries,
    isLoading: stream.isLoading,
    error: stream.error,
    refetch,
  }
}
