import { act, renderHook, waitFor } from "@testing-library/react"
import type { EventCallback } from "@tauri-apps/api/event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useSearchStore } from "../../model/store"
import { useSearchWithProgress } from "../useSearchWithProgress"
import type { SearchBatchEvent, SearchProgressEvent } from "@/shared/api/tauri/events"

vi.mock("@/shared/api/tauri/client", () => ({
  tauriClient: { searchFilesStream: vi.fn() },
}))

vi.mock("@/shared/api/tauri", () => ({
  tauriEvents: {
    searchProgress: vi.fn(async () => () => {}),
    searchBatch: vi.fn(async () => () => {}),
  },
}))

vi.mock("@/entities/app-settings", () => ({
  usePerformanceSettings: () => ({ maxSearchResults: 100 }),
}))

vi.mock("@/shared/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared/ui")>()
  return { ...actual, toast: { success: vi.fn(), error: vi.fn() } }
})

import { tauriClient } from "@/shared/api/tauri/client"
import { toast } from "@/shared/ui"

describe("useSearchWithProgress", () => {
  beforeEach(() => {
    useSearchStore.getState().reset()
    vi.clearAllMocks()
  })

  it("happy path: searches and shows success toast", async () => {
    useSearchStore.setState({
      query: "readme",
      searchPath: "C:/test",
      searchContent: false,
    })
    vi.mocked(tauriClient.searchFilesStream).mockResolvedValue([
      { path: "C:/test/readme.txt", name: "readme.txt", is_dir: false, matches: [] },
    ])
    const { result } = renderHook(() => useSearchWithProgress())
    await act(async () => {
      await result.current.search()
    })
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("1"))
    })
  })

  it("IPC error: shows toast.error", async () => {
    useSearchStore.setState({ query: "x", searchPath: "C:/test" })
    vi.mocked(tauriClient.searchFilesStream).mockRejectedValue(new Error("IPC fail"))
    const { result } = renderHook(() => useSearchWithProgress())
    await act(async () => {
      await result.current.search()
    })
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("IPC fail"))
  })

  it("invalid state: empty query does not call IPC", async () => {
    useSearchStore.setState({ query: "  ", searchPath: "C:/test" })
    const { result } = renderHook(() => useSearchWithProgress())
    await act(async () => {
      await result.current.search()
    })
    expect(tauriClient.searchFilesStream).not.toHaveBeenCalled()
  })

  it("streams progress and batch events with throttling", async () => {
    const { tauriEvents } = await import("@/shared/api/tauri")
    let progressCb: EventCallback<SearchProgressEvent> | null = null
    let batchCb: EventCallback<SearchBatchEvent> | null = null

    vi.mocked(tauriEvents.searchProgress).mockImplementation(async (cb) => {
      progressCb = cb
      return () => {}
    })
    vi.mocked(tauriEvents.searchBatch).mockImplementation(async (cb) => {
      batchCb = cb
      return () => {}
    })

    useSearchStore.setState({ query: "readme", searchPath: "C:/test", shouldCancel: false })
    vi.mocked(tauriClient.searchFilesStream).mockImplementation(async () => {
      progressCb?.({ event: "search-progress", id: 1, payload: { scanned: 10, found: 1, current_path: "C:/test" } })
      batchCb?.({
        event: "search-batch",
        id: 2,
        payload: [{ path: "C:/test/readme.txt", name: "readme.txt", is_dir: false, matches: [] }],
      })
      return [{ path: "C:/test/readme.txt", name: "readme.txt", is_dir: false, matches: [] }]
    })

    vi.useFakeTimers()
    const { result } = renderHook(() => useSearchWithProgress())
    await act(async () => {
      await result.current.search()
    })
    act(() => {
      vi.advanceTimersByTime(200)
    })
    vi.useRealTimers()

    expect(toast.success).toHaveBeenCalled()
  })
})
