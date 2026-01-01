import { useCallback, useEffect, useReducer, useRef, useState } from "react"
import type { FileEntry } from "@/shared/api/tauri"
import { tauriEvents } from "@/shared/api/tauri"
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
  const [refreshToken, setRefreshToken] = useState(0)
  const pathRef = useRef(path)
  const unlistenRef = useRef<(() => void) | null>(null)
  const unlistenCompleteRef = useRef<(() => void) | null>(null)
  const requestIdRef = useRef<string | null>(null)
  const seenPathsRef = useRef<Set<string>>(new Set())

  // biome-ignore lint/correctness/useExhaustiveDependencies: refreshToken is a deliberate trigger to restart streaming even when path doesn't change.
  useEffect(() => {
    // Reset when path changes
    if (pathRef.current !== path) {
      pathRef.current = path
      seenPathsRef.current = new Set()
      dispatch({ type: "RESET" })
    }

    if (!path) return

    let cancelled = false

    const startStream = async () => {
      dispatch({ type: "START" })

      // New stream id for this run. Used to ignore late events from old streams.
      requestIdRef.current = `${Date.now()}-${Math.random().toString(16).slice(2)}`
      seenPathsRef.current = new Set()

      // Cleanup previous listener
      if (unlistenRef.current) {
        unlistenRef.current()
        unlistenRef.current = null
      }
      if (unlistenCompleteRef.current) {
        unlistenCompleteRef.current()
        unlistenCompleteRef.current = null
      }

      try {
        // Setup event listener
        const unlisten = await tauriEvents.directoryBatch((event) => {
          if (cancelled) return

          const currentRequestId = requestIdRef.current
          if (!currentRequestId || event.payload.request_id !== currentRequestId) {
            return
          }

          // Extra safety: ignore batches for other paths.
          if (event.payload.path !== pathRef.current) {
            return
          }

          if (event.payload.entries.length > 0) {
            const seen = seenPathsRef.current
            const unique = event.payload.entries.filter((e) => {
              if (seen.has(e.path)) return false
              seen.add(e.path)
              return true
            })
            if (unique.length > 0) {
              dispatch({ type: "ADD_ENTRIES", payload: unique })
            }
          }
        })
        unlistenRef.current = unlisten

        // Setup complete listener
        const unlistenComplete = await tauriEvents.directoryComplete((event) => {
          if (cancelled) return

          const currentRequestId = requestIdRef.current
          if (!currentRequestId || event.payload.request_id !== currentRequestId) {
            return
          }

          if (event.payload.path !== pathRef.current) {
            return
          }

          dispatch({ type: "COMPLETE" })
        })
        unlistenCompleteRef.current = unlistenComplete

        // Start streaming: client throws on error, keep event listeners for entries/completion
        try {
          await tauriClient.readDirectoryStream(path, requestIdRef.current)
        } catch (err) {
          if (!cancelled) {
            dispatch({ type: "ERROR", payload: String(err) })
          }
        }
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
      if (unlistenCompleteRef.current) {
        unlistenCompleteRef.current()
        unlistenCompleteRef.current = null
      }
    }
  }, [path, refreshToken])

  const refresh = useCallback(() => {
    if (!path) return

    // Force restart of streaming even if path didn't change.
    // Important for immediate UI updates after create/rename/delete/copy/move.
    dispatch({ type: "RESET" })
    setRefreshToken((x) => x + 1)
  }, [path])

  return {
    entries: state.entries,
    isLoading: state.isLoading,
    error: state.error,
    isComplete: state.isComplete,
    refresh,
  }
}
