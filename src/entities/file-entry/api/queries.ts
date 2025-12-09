import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { commands, type Result } from "@/shared/api/tauri";

// Хелпер для распаковки Result из tauri-specta
function unwrapResult<T, E>(result: Result<T, E>): T {
  if (result.status === "ok") {
    return result.data;
  }
  throw new Error(String(result.error));
}

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
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function useDrives() {
  return useQuery({
    queryKey: fileKeys.drives(),
    queryFn: async () => unwrapResult(await commands.getDrives()),
    staleTime: 60_000,
  });
}

export function useCreateDirectory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (path: string) =>
      unwrapResult(await commands.createDirectory(path)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fileKeys.all });
    },
  });
}

export function useCreateFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (path: string) =>
      unwrapResult(await commands.createFile(path)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fileKeys.all });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fileKeys.all });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fileKeys.all });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fileKeys.all });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fileKeys.all });
    },
  });
}
