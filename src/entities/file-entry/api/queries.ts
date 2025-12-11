import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { commands } from "@/shared/api/tauri";
import { unwrapResult } from "@/shared/lib";
import { CACHE_TIME } from "@/shared/config";

export const fileKeys = {
  all: ["files"] as const,
  directory: (path: string) => [...fileKeys.all, "directory", path] as const,
  drives: () => [...fileKeys.all, "drives"] as const,
};

export function useDirectoryContents(path: string | null) {
  return useQuery({
    queryKey: fileKeys.directory(path ?? ""),
    queryFn: async () => unwrapResult(await commands.readDirectory(path!)),
    enabled: !!path,
    staleTime: CACHE_TIME.DIRECTORY,
    refetchOnWindowFocus: false,
  });
}

export function useDrives() {
  return useQuery({
    queryKey: fileKeys.drives(),
    queryFn: async () => unwrapResult(await commands.getDrives()),
    staleTime: CACHE_TIME.DRIVES,
  });
}

export function useCreateDirectory() {
  const queryClient = useQueryClient();

  const getParent = (p: string) => {
    const i = Math.max(p.lastIndexOf("\\"), p.lastIndexOf("/"));
    return i < 0 ? p : p.slice(0, i);
  };

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
      const i = Math.max(path.lastIndexOf("\\"), path.lastIndexOf("/"));
      const parent = i < 0 ? path : path.slice(0, i);
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
      const parents = Array.from(
        new Set(
          paths.map((p) => {
            const i = Math.max(p.lastIndexOf("\\"), p.lastIndexOf("/"));
            return i < 0 ? p : p.slice(0, i);
          })
        )
      );
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
      const parent = i < 0 ? oldPath : oldPath.slice(0, i);
      queryClient.invalidateQueries({ queryKey: fileKeys.directory(parent) });
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
      const parents = Array.from(
        new Set(
          sources.map((p) => {
            const i = Math.max(p.lastIndexOf("\\"), p.lastIndexOf("/"));
            return i < 0 ? p : p.slice(0, i);
          })
        )
      );
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
      const parents = Array.from(
        new Set(
          sources.map((p) => {
            const i = Math.max(p.lastIndexOf("\\"), p.lastIndexOf("/"));
            return i < 0 ? p : p.slice(0, i);
          })
        )
      );
      parents.push(destination);
      parents.forEach((parent) => {
        queryClient.invalidateQueries({ queryKey: fileKeys.directory(parent) });
      });
    },
  });
}
