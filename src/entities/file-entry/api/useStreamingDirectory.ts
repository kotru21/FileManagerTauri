import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import type { FileEntry } from "@/entities/file-entry";
import { commands } from "@/shared/api/tauri";

// Состояние стриминга
interface StreamState {
  entries: FileEntry[];
  isLoading: boolean;
}

// Действия для reducer
type StreamAction =
  | { type: "START_LOADING" }
  | { type: "ADD_BATCH"; payload: FileEntry[] }
  | { type: "COMPLETE" }
  | { type: "RESET" };

// Reducer для эффективного обновления состояния (избегаем O(n) на каждый batch)
function streamReducer(state: StreamState, action: StreamAction): StreamState {
  switch (action.type) {
    case "START_LOADING":
      return { entries: [], isLoading: true };
    case "ADD_BATCH":
      return {
        entries: [...state.entries, ...action.payload],
        isLoading: true,
      };
    case "COMPLETE":
      return { ...state, isLoading: false };
    case "RESET":
      return { entries: [], isLoading: false };
    default:
      return state;
  }
}

function isFileEntryArray(v: unknown): v is FileEntry[] {
  if (!Array.isArray(v)) return false;
  return v.every((it) => {
    if (typeof it !== "object" || it === null) return false;
    const obj = it as Record<string, unknown>;
    return (
      typeof obj.name === "string" &&
      typeof obj.path === "string" &&
      typeof obj.is_dir === "boolean"
    );
  });
}

export function useStreamingDirectory(path: string | null) {
  const [state, dispatch] = useReducer(streamReducer, {
    entries: [],
    isLoading: false,
  });
  const [triggerRefresh, setTriggerRefresh] = useState(0);
  const previousPath = useRef<string | null>(null);
  const isInitialMount = useRef(true);
  // ref для накопления batch'ей перед dispatch
  const batchBuffer = useRef<FileEntry[]>([]);

  // Keep track of previous path and reset when it changes
  useEffect(() => {
    if (!path) return;
    if (previousPath.current !== path) {
      previousPath.current = path;
      isInitialMount.current = true;
      batchBuffer.current = [];
      dispatch({ type: "RESET" });
    }
  }, [path]);

  useEffect(() => {
    if (!path) return;

    if (isInitialMount.current || triggerRefresh !== 0) {
      isInitialMount.current = false;
    }

    let cancelled = false;
    batchBuffer.current = [];

    dispatch({ type: "START_LOADING" });

    // Keep a reference to unlisten functions so can remove listeners reliably
    let unlistenBatchFn: (() => void) | null = null;
    let unlistenCompleteFn: (() => void) | null = null;

    const setup = async () => {
      const ub = await listen<FileEntry[]>("directory-batch", (event) => {
        if (cancelled) return;
        const payload = event.payload;
        if (!isFileEntryArray(payload)) {
          console.warn("Invalid directory-batch payload", payload);
          return;
        }
        dispatch({ type: "ADD_BATCH", payload });
      });
      unlistenBatchFn = ub;

      const uc = await listen<string>("directory-complete", () => {
        if (cancelled) return;
        dispatch({ type: "COMPLETE" });
      });
      unlistenCompleteFn = uc;

      // Fire the stream command after listeners are registered
      await commands.readDirectoryStream(path);
    };

    setup();

    return () => {
      cancelled = true;
      unlistenBatchFn?.();
      unlistenCompleteFn?.();
    };
  }, [path, triggerRefresh]);

  const refresh = useCallback(() => {
    setTriggerRefresh((prev) => prev + 1);
  }, []);

  return {
    entries: state.entries,
    isLoading: state.isLoading,
    refresh,
  };
}
