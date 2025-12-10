import { listen } from "@tauri-apps/api/event";
import { useState, useEffect, useCallback, useRef, useReducer } from "react";
import type { FileEntry } from "@/shared/api/tauri";
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
      // Мутируем массив напрямую и возвращаем новый объект состояния
      // Это эффективнее чем spread operator для больших массивов
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

export function useStreamingDirectory(path: string | null) {
  const [state, dispatch] = useReducer(streamReducer, {
    entries: [],
    isLoading: false,
  });
  const [triggerRefresh, setTriggerRefresh] = useState(0);
  const previousPath = useRef<string | null>(null);
  const isInitialMount = useRef(true);
  // Используем ref для накопления batch'ей перед dispatch
  const batchBuffer = useRef<FileEntry[]>([]);

  // Сбрасываем состояние при изменении пути
  const shouldReset = path !== previousPath.current;
  if (shouldReset && path) {
    previousPath.current = path;
  }

  useEffect(() => {
    if (!path) return;

    // При первом монтировании или изменении пути
    if (isInitialMount.current || shouldReset) {
      isInitialMount.current = false;
    }

    let cancelled = false;
    batchBuffer.current = [];

    // Начинаем загрузку
    dispatch({ type: "START_LOADING" });

    const unlistenBatch = listen<FileEntry[]>("directory-batch", (event) => {
      if (cancelled) return;
      // Добавляем batch напрямую через dispatch
      dispatch({ type: "ADD_BATCH", payload: event.payload });
    });

    const unlistenComplete = listen<string>("directory-complete", () => {
      if (cancelled) return;
      dispatch({ type: "COMPLETE" });
    });

    commands.readDirectoryStream(path);

    return () => {
      cancelled = true;
      unlistenBatch.then((fn) => fn());
      unlistenComplete.then((fn) => fn());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
