import { useMutation, useQueryClient } from "@tanstack/react-query"
import { commands, type Result } from "@/shared/api/tauri"
import { fileKeys } from "./keys"

function unwrapResult<T, E>(result: Result<T, E>): T {
  if (result.status === "ok") {
    return result.data
  }
  throw new Error(String(result.error))
}

export function useCreateDirectory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (path: string) => {
      const result = await commands.createDirectory(path)
      return unwrapResult(result)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fileKeys.all })
    },
  })
}

export function useCreateFile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (path: string) => {
      const result = await commands.createFile(path)
      return unwrapResult(result)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fileKeys.all })
    },
  })
}

export function useDeleteEntries() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ paths, permanent }: { paths: string[]; permanent: boolean }) => {
      const result = await commands.deleteEntries(paths, permanent)
      return unwrapResult(result)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fileKeys.all })
    },
  })
}

export function useRenameEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ oldPath, newName }: { oldPath: string; newName: string }) => {
      const result = await commands.renameEntry(oldPath, newName)
      return unwrapResult(result)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fileKeys.all })
    },
  })
}

export function useCopyEntries() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ sources, destination }: { sources: string[]; destination: string }) => {
      const result = await commands.copyEntries(sources, destination)
      return unwrapResult(result)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fileKeys.all })
    },
  })
}

export function useCopyEntriesParallel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ sources, destination }: { sources: string[]; destination: string }) => {
      const result = await commands.copyEntriesParallel(sources, destination)
      return unwrapResult(result)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fileKeys.all })
    },
  })
}

export function useMoveEntries() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ sources, destination }: { sources: string[]; destination: string }) => {
      const result = await commands.moveEntries(sources, destination)
      return unwrapResult(result)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fileKeys.all })
    },
  })
}
