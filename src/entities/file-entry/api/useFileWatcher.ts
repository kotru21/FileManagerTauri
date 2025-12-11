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
    let cancelled = false;
    let unlistenFn: (() => void) | null = null;

    const setup = async () => {
      unlistenFn = await listen<FsChangeEvent>("fs-change", () => {
        queryClient.invalidateQueries({
          queryKey: fileKeys.directory(currentPath),
        });
      });

      if (watchedPath.current && watchedPath.current !== currentPath) {
        try {
          await commands.unwatchDirectory(watchedPath.current);
        } catch {
          // ignore, best effort
        }
        watchedPath.current = null;
      }

      if (watchedPath.current !== currentPath && !cancelled) {
        watchedPath.current = currentPath;
        await commands.watchDirectory(currentPath);
      }
    };

    setup();

    return () => {
      cancelled = true;
      unlistenFn?.();
      if (watchedPath.current) {
        commands.unwatchDirectory(watchedPath.current).catch(() => {});
        watchedPath.current = null;
      }
    };
  }, [currentPath, queryClient]);
}
