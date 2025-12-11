import { listen } from "@tauri-apps/api/event";
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { commands } from "@/shared/api/tauri";
import { fileKeys } from "./queries";

type FsChangeKind = "Create" | "Modify" | "Remove" | "Rename" | "Other";

interface FsChangeEvent {
  kind: FsChangeKind;
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
      try {
        const localUnlisten = await listen<FsChangeEvent>("fs-change", () => {
          // Only perform invalidation if not cancelled
          if (cancelled) return;
          queryClient.invalidateQueries({
            queryKey: fileKeys.directory(currentPath),
          });
        });
        if (cancelled) {
          // Component unmounted before listener was attached — cleanup
          localUnlisten();
          return;
        }
        unlistenFn = localUnlisten;

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
      } catch (e) {
        // Log and ignore, don't crash the hook
        console.error("File watcher setup failed:", e);
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
