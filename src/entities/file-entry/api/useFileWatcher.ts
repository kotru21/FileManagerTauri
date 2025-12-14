// src/entities/file-entry/api/useFileWatcher.ts
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

  // Используем useCallback с currentPath в замыкании через ref
  const invalidateDirectoryQueries = useCallback(() => {
    const path = currentPathRef.current;
    if (path) {
      queryClient.invalidateQueries({ queryKey: fileKeys.directory(path) });
    }
  }, [queryClient]);

  // Debounced invalidation to avoid rapid re-fetches
  const debouncedInvalidate = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      invalidateDirectoryQueries();
    }, 300);
  }, [invalidateDirectoryQueries]);

  useEffect(() => {
    // Cleanup if path becomes null
    if (!currentPath) {
      if (currentPathRef.current) {
        commands.unwatchDirectory(currentPathRef.current).catch(() => {});
      }
      currentPathRef.current = null;
      return;
    }

    // Skip if same path
    if (currentPathRef.current === currentPath) {
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
          const isRelevant = paths.some((changedPath) => {
            const normalizedChanged = changedPath.replace(/\\/g, "/");
            const normalizedCurrent = currentPath.replace(/\\/g, "/");
            const changedDir = normalizedChanged.substring(
              0,
              normalizedChanged.lastIndexOf("/")
            );
            return (
              changedDir === normalizedCurrent ||
              normalizedChanged === normalizedCurrent
            );
          });

          if (isRelevant) {
            debouncedInvalidate();
          }
        }
      );

      // Start watching
      try {
        await commands.watchDirectory(currentPath);
      } catch (error) {
        console.error("Failed to watch directory:", error);
      }
    };

    setupWatcher();

    // Cleanup on unmount
    return () => {
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
  }, [currentPath, debouncedInvalidate]);

  // Force refresh function
  const refresh = useCallback(() => {
    invalidateDirectoryQueries();
  }, [invalidateDirectoryQueries]);

  return { refresh };
}
