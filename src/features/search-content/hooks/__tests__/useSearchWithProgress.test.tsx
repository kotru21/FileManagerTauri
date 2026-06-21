import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useSearchStore } from "../../model/store"
import { useSearchWithProgress } from "../useSearchWithProgress"

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
})
