import { useMutation, useQueryClient } from "@tanstack/react-query"
import { commands } from "@/shared/api/tauri"
import { fileKeys } from "./keys"

import { unwrapResult } from "@/shared/api/tauri/client"

export function useCreateDirectory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (path: string) => {
      const result = await commands.createDirectory(path)
      unwrapResult(result)
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
      unwrapResult(result)
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
      unwrapResult(result)
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
      unwrapResult(result)
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
      unwrapResult(result)
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
      unwrapResult(result)
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
      unwrapResult(result)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fileKeys.all })
    },
  })
}
