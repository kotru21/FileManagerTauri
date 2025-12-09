import { listen } from "@tauri-apps/api/event";
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { commands } from "@/shared/api/tauri";
import { fileKeys } from "./queries";

interface FsChangeEvent {
  kind: string;
  paths: string[];
}

export function useFileWatcher(currentPath: string | null) {
  const queryClient = useQueryClient();
  const watchedPath = useRef<string | null>(null);

  useEffect(() => {
    if (!currentPath) return;

    const unlisten = listen<FsChangeEvent>("fs-change", () => {
      queryClient.invalidateQueries({
        queryKey: fileKeys.directory(currentPath),
      });
    });

    // Начинаем отслеживать, если путь изменился
    if (watchedPath.current !== currentPath) {
      watchedPath.current = currentPath;
      commands.watchDirectory(currentPath);
    }

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [currentPath, queryClient]);
}
