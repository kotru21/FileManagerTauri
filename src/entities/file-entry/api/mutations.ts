import { useMutation, useQueryClient } from "@tanstack/react-query"
import { tauriClient } from "@/shared/api/tauri/client"
import { fileKeys } from "./keys"

export function useCreateDirectory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (path: string) => {
      await tauriClient.createDirectory(path)
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
      await tauriClient.createFile(path)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fileKeys.all })
    },
  })
}

export function useDeleteEntries() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ paths }: { paths: string[] }) => {
      await tauriClient.deleteEntries(paths)
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
      await tauriClient.renameEntry(oldPath, newName)
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
      await tauriClient.copyEntries(sources, destination)
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
      await tauriClient.copyEntriesParallel(sources, destination)
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
      await tauriClient.moveEntries(sources, destination)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fileKeys.all })
    },
  })
}
