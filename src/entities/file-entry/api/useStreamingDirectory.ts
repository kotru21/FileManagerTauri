import { listen } from "@tauri-apps/api/event"
import { useCallback, useEffect, useReducer, useRef } from "react"
import type { FileEntry } from "@/shared/api/tauri"
import { tauriClient } from "@/shared/api/tauri/client"

interface State {
  entries: FileEntry[]
  isLoading: boolean
  error: string | null
  isComplete: boolean
}

type Action =
  | { type: "START" }
  | { type: "ADD_ENTRIES"; payload: FileEntry[] }
  | { type: "COMPLETE" }
  | { type: "ERROR"; payload: string }
  | { type: "RESET" }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "START":
      return { entries: [], isLoading: true, error: null, isComplete: false }
    case "ADD_ENTRIES": {
      // Push to array without spread - more efficient for large arrays
      const newEntries = state.entries.slice()
      newEntries.push(...action.payload)
      return { ...state, entries: newEntries }
    }
    case "COMPLETE":
      return { ...state, isLoading: false, isComplete: true }
    case "ERROR":
      return { ...state, isLoading: false, error: action.payload }
    case "RESET":
      return { entries: [], isLoading: false, error: null, isComplete: false }
    default:
      return state
  }
}

const initialState: State = {
  entries: [],
  isLoading: false,
  error: null,
  isComplete: false,
}

export function useStreamingDirectory(path: string | null) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const pathRef = useRef(path)
  const unlistenRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    // Reset when path changes
    if (pathRef.current !== path) {
      pathRef.current = path
      dispatch({ type: "RESET" })
    }

    if (!path) return

    let cancelled = false

    const startStream = async () => {
      dispatch({ type: "START" })

      // Cleanup previous listener
      if (unlistenRef.current) {
        unlistenRef.current()
        unlistenRef.current = null
      }

      try {
        // Setup event listener
        const unlisten = await listen<FileEntry[]>("directory-entries", (event) => {
          if (cancelled) return
          if (event.payload.length > 0) {
            dispatch({ type: "ADD_ENTRIES", payload: event.payload })
          }
        })
        unlistenRef.current = unlisten

        // Setup complete listener
        const unlistenComplete = await listen("directory-complete", () => {
          if (cancelled) return
          dispatch({ type: "COMPLETE" })
        })

        // Start streaming: client throws on error, keep event listeners for entries/completion
        try {
          await tauriClient.readDirectoryStream(path)
        } catch (err) {
          if (!cancelled) {
            dispatch({ type: "ERROR", payload: String(err) })
          }
        }

        // Cleanup complete listener on completion
        unlistenComplete()
      } catch (err) {
        if (!cancelled) {
          dispatch({ type: "ERROR", payload: String(err) })
        }
      }
    }

    startStream()

    return () => {
      cancelled = true
      if (unlistenRef.current) {
        unlistenRef.current()
        unlistenRef.current = null
      }
    }
  }, [path])

  const refresh = useCallback(() => {
    if (path) {
      dispatch({ type: "RESET" })
      // Trigger re-fetch by updating a dep - use a key or similar pattern
    }
  }, [path])

  return {
    entries: state.entries,
    isLoading: state.isLoading,
    error: state.error,
    isComplete: state.isComplete,
    refresh,
  }
}
