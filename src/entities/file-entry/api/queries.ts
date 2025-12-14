import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { commands } from "@/shared/api/tauri";
import { invoke as TAURI_INVOKE } from "@tauri-apps/api/core";
import type { FileEntry, DriveInfo } from "@/shared/api/tauri";
import { CACHE_TIME } from "@/shared/config";
import { unwrapResult, getParent } from "@/shared/lib";

export const fileKeys = {
  all: ["files"] as const,
  directory: (path: string) => [...fileKeys.all, "directory", path] as const,
  directoryStats: (path: string) =>
    [...fileKeys.all, "directory-stats", path] as const,
  drives: () => [...fileKeys.all, "drives"] as const,
};

export function useDirectoryContents(path: string | null) {
  return useQuery<FileEntry[]>({
    queryKey: fileKeys.directory(path ?? ""),
    queryFn: async () => {
      if (!path) {
        throw new Error("Directory path is required");
      }
      return unwrapResult(await commands.readDirectory(path));
    },
    enabled: !!path,
    staleTime: CACHE_TIME.DIRECTORY,
    // keepPreviousData: true,
    refetchOnWindowFocus: false,
  });
}

export function useDrives() {
  return useQuery<DriveInfo[]>({
    queryKey: fileKeys.drives(),
    queryFn: async () => unwrapResult(await commands.getDrives()),
    staleTime: CACHE_TIME.DRIVES,
  });
}

export interface DirectoryStats {
  count: number;
  exceeded_threshold: boolean;
}

export function useDirectoryStats(path: string | null) {
  return useQuery<DirectoryStats>({
    queryKey: fileKeys.directoryStats(path ?? ""),
    queryFn: async () => {
      if (!path) throw new Error("Directory path is required");
      return await TAURI_INVOKE("get_directory_stats", { path });
    },
    enabled: !!path,
    staleTime: CACHE_TIME.DIRECTORY,
  });
}

export function useCreateDirectory() {
  const queryClient = useQueryClient();

  // Use shared utility getParent

  return useMutation({
    mutationFn: async (path: string) =>
      unwrapResult(await commands.createDirectory(path)),
    onSuccess: (_data, path) => {
      const parent = getParent(path);
      queryClient.invalidateQueries({ queryKey: fileKeys.directory(parent) });
    },
  });
}

export function useCreateFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (path: string) =>
      unwrapResult(await commands.createFile(path)),
    onSuccess: (_data, path) => {
      const parent = getParent(path);
      queryClient.invalidateQueries({ queryKey: fileKeys.directory(parent) });
    },
  });
}

export function useDeleteEntries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      paths,
      permanent,
    }: {
      paths: string[];
      permanent: boolean;
    }) => unwrapResult(await commands.deleteEntries(paths, permanent)),
    onSuccess: (_data, { paths }) => {
      const parents = Array.from(new Set(paths.map((p) => getParent(p))));
      parents.forEach((parent) => {
        queryClient.invalidateQueries({ queryKey: fileKeys.directory(parent) });
      });
    },
  });
}

export function useRenameEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      oldPath,
      newName,
    }: {
      oldPath: string;
      newName: string;
    }) => unwrapResult(await commands.renameEntry(oldPath, newName)),
    onSuccess: (_data, { oldPath }) => {
      const i = Math.max(oldPath.lastIndexOf("\\"), oldPath.lastIndexOf("/"));
      let parent = i < 0 ? oldPath : oldPath.slice(0, i);
      if (/^[A-Za-z]:$/.test(parent)) parent = parent + "\\";
      queryClient.invalidateQueries({
        queryKey: fileKeys.directory(getParent(oldPath)),
      });
    },
  });
}

export function useCopyEntries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sources,
      destination,
    }: {
      sources: string[];
      destination: string;
    }) => unwrapResult(await commands.copyEntries(sources, destination)),
    onSuccess: (_data, { sources, destination }) => {
      const parents = Array.from(new Set(sources.map((p) => getParent(p))));
      parents.push(destination);
      parents.forEach((parent) => {
        queryClient.invalidateQueries({ queryKey: fileKeys.directory(parent) });
      });
    },
  });
}

/**
 * Параллельное копирование с прогрессом (для больших операций)
 * Отправляет события "copy-progress" через Tauri
 */
export function useCopyEntriesParallel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sources,
      destination,
    }: {
      sources: string[];
      destination: string;
    }) =>
      unwrapResult(await commands.copyEntriesParallel(sources, destination)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fileKeys.all });
    },
  });
}

export function useMoveEntries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sources,
      destination,
    }: {
      sources: string[];
      destination: string;
    }) => unwrapResult(await commands.moveEntries(sources, destination)),
    onSuccess: (_data, { sources, destination }) => {
      const parents = Array.from(new Set(sources.map((p) => getParent(p))));
      parents.push(destination);
      parents.forEach((parent) => {
        queryClient.invalidateQueries({ queryKey: fileKeys.directory(parent) });
      });
    },
  });
}
