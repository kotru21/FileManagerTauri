import { useMutation, useQueryClient } from "@tanstack/react-query"
import { tauriClient } from "@/shared/api/tauri/client"
import { invalidateAffectedDirectories } from "./invalidateDirectory"

export function useCreateDirectory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (path: string) => {
      await tauriClient.createDirectory(path)
    },
    onSuccess: (_data, path) => {
      invalidateAffectedDirectories(queryClient, { paths: [path] })
    },
  })
}

export function useCreateFile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (path: string) => {
      await tauriClient.createFile(path)
    },
    onSuccess: (_data, path) => {
      invalidateAffectedDirectories(queryClient, { paths: [path] })
    },
  })
}

export function useDeleteEntries() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ paths }: { paths: string[] }) => {
      await tauriClient.deleteEntries(paths)
    },
    onSuccess: (_data, { paths }) => {
      invalidateAffectedDirectories(queryClient, { paths })
    },
  })
}

export function useRenameEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ oldPath, newName }: { oldPath: string; newName: string }) => {
      await tauriClient.renameEntry(oldPath, newName)
    },
    onSuccess: (_data, { oldPath }) => {
      invalidateAffectedDirectories(queryClient, { paths: [oldPath] })
    },
  })
}

export function useCopyEntries() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ sources, destination }: { sources: string[]; destination: string }) => {
      await tauriClient.copyEntries(sources, destination)
    },
    onSuccess: (_data, { sources, destination }) => {
      invalidateAffectedDirectories(queryClient, { paths: sources, destination })
    },
  })
}

export function useCopyEntriesParallel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ sources, destination }: { sources: string[]; destination: string }) => {
      await tauriClient.copyEntriesParallel(sources, destination)
    },
    onSuccess: (_data, { sources, destination }) => {
      invalidateAffectedDirectories(queryClient, { paths: sources, destination })
    },
  })
}

export function useMoveEntries() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ sources, destination }: { sources: string[]; destination: string }) => {
      await tauriClient.moveEntries(sources, destination)
    },
    onSuccess: (_data, { sources, destination }) => {
      invalidateAffectedDirectories(queryClient, { paths: sources, destination })
    },
  })
}
