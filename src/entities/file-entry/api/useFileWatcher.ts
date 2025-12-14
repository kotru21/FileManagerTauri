import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { commands } from "@/shared/api/tauri";
import { fileKeys } from "./queries";

interface FsChangeEvent {
  kind: string;
  paths: string[];
}

export function useFileWatcher(currentPath: string | null) {
  const queryClient = useQueryClient();
  const unlistenRef = useRef<UnlistenFn | null>(null);
  const currentPathRef = useRef<string | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced invalidation to avoid rapid re-fetches
  const invalidateDirectory = useCallback(
    (path: string) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: fileKeys.directory(path),
        });
      }, 100);
    },
    [queryClient]
  );

  useEffect(() => {
    if (!currentPath) {
      // Cleanup if path becomes null
      if (currentPathRef.current) {
        commands.unwatchDirectory(currentPathRef.current).catch(() => {});
        currentPathRef.current = null;
      }
      return;
    }

    // Skip if same path
    if (currentPath === currentPathRef.current) {
      return;
    }

    const setupWatcher = async () => {
      // Cleanup previous watcher
      if (currentPathRef.current) {
        try {
          await commands.unwatchDirectory(currentPathRef.current);
        } catch {
          // Ignore cleanup errors
        }
      }

      // Cleanup previous listener
      if (unlistenRef.current) {
        unlistenRef.current();
        unlistenRef.current = null;
      }

      currentPathRef.current = currentPath;

      try {
        // Setup event listener first
        unlistenRef.current = await listen<FsChangeEvent>(
          "fs-change",
          (event) => {
            const { kind, paths } = event.payload;

            // Skip access events
            if (kind.includes("Access")) {
              return;
            }

            // Check if any changed path is in current directory
            const shouldInvalidate = paths.some((changedPath) => {
              const normalizedChanged = changedPath.replace(/\\/g, "/");
              const normalizedCurrent = currentPath.replace(/\\/g, "/");
              return (
                normalizedChanged.startsWith(normalizedCurrent) ||
                normalizedChanged === normalizedCurrent
              );
            });

            if (shouldInvalidate) {
              invalidateDirectory(currentPath);
            }
          }
        );

        // Start watching
        await commands.watchDirectory(currentPath);
      } catch (error) {
        console.error("Failed to setup file watcher:", error);
      }
    };

    setupWatcher();

    return () => {
      // Cleanup on unmount
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      if (unlistenRef.current) {
        unlistenRef.current();
        unlistenRef.current = null;
      }

      if (currentPathRef.current) {
        commands.unwatchDirectory(currentPathRef.current).catch(() => {});
        currentPathRef.current = null;
      }
    };
  }, [currentPath, invalidateDirectory]);
}
