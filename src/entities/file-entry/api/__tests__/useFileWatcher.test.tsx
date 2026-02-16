import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, render, waitFor } from "@testing-library/react"
import { useFileWatcher } from "../useFileWatcher"

vi.mock("@/shared/api/tauri", () => ({
  tauriEvents: {
    fsChange: vi.fn().mockResolvedValue(vi.fn()),
  },
}))

vi.mock("@/shared/api/tauri/client", () => ({
  tauriClient: {
    watchDirectory: vi.fn().mockResolvedValue(null),
    unwatchDirectory: vi.fn().mockResolvedValue(null),
  },
}))

import { tauriEvents } from "@/shared/api/tauri"
import { tauriClient } from "@/shared/api/tauri/client"

type FsCallback = (event: { payload: { kind: string; paths: string[] } }) => void

// biome-ignore lint/suspicious/noExplicitAny: test helper needs flexible typing to capture callback
type MockableFsChange = (...args: any[]) => Promise<() => void>

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
  return { queryClient, Wrapper }
}

function TestHarness({ path }: { path: string | null }) {
  const { refresh } = useFileWatcher(path)
  return (
    <button type="button" data-testid="refresh" onClick={refresh}>
      Refresh
    </button>
  )
}

function mockFsChangeWithCapture() {
  let fsCallback: FsCallback = () => {}
  vi.mocked(tauriEvents.fsChange).mockImplementation((async (cb: FsCallback) => {
    fsCallback = cb
    return () => {}
  }) as MockableFsChange)
  return () => fsCallback
}

describe("useFileWatcher", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("does not set up watcher when path is null", () => {
    const { Wrapper } = createWrapper()
    render(<TestHarness path={null} />, { wrapper: Wrapper })

    expect(tauriClient.watchDirectory).not.toHaveBeenCalled()
    expect(tauriEvents.fsChange).not.toHaveBeenCalled()
  })

  it("sets up watcher for the given path", async () => {
    vi.mocked(tauriEvents.fsChange).mockResolvedValue(vi.fn())

    const { Wrapper } = createWrapper()
    render(<TestHarness path="/home/user" />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(tauriEvents.fsChange).toHaveBeenCalled()
      expect(tauriClient.watchDirectory).toHaveBeenCalledWith("/home/user")
    })
  })

  it("cleans up watcher on unmount", async () => {
    const unlisten = vi.fn()
    vi.mocked(tauriEvents.fsChange).mockResolvedValue(unlisten)

    const { Wrapper } = createWrapper()
    const { unmount } = render(<TestHarness path="/home/user" />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(tauriClient.watchDirectory).toHaveBeenCalled()
    })

    unmount()

    expect(unlisten).toHaveBeenCalled()
    expect(tauriClient.unwatchDirectory).toHaveBeenCalledWith("/home/user")
  })

  it("switches watcher when path changes", async () => {
    const unlisten1 = vi.fn()
    const unlisten2 = vi.fn()
    vi.mocked(tauriEvents.fsChange)
      .mockResolvedValueOnce(unlisten1)
      .mockResolvedValueOnce(unlisten2)

    const { Wrapper } = createWrapper()
    const { rerender } = render(<TestHarness path="/path1" />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(tauriClient.watchDirectory).toHaveBeenCalledWith("/path1")
    })

    rerender(<TestHarness path="/path2" />)

    await waitFor(() => {
      expect(tauriClient.unwatchDirectory).toHaveBeenCalledWith("/path1")
      expect(tauriClient.watchDirectory).toHaveBeenCalledWith("/path2")
    })
  })

  it("ignores Access kind events", async () => {
    vi.useFakeTimers()
    const getCallback = mockFsChangeWithCapture()

    const { Wrapper, queryClient } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")
    render(<TestHarness path="/home/user" />, { wrapper: Wrapper })

    await vi.advanceTimersByTimeAsync(0)

    getCallback()({ payload: { kind: "Access", paths: ["/home/user/file.txt"] } })

    await vi.advanceTimersByTimeAsync(500)

    expect(invalidateSpy).not.toHaveBeenCalled()
    vi.useRealTimers()
  })

  it("debounces invalidation on relevant changes", async () => {
    vi.useFakeTimers()
    const getCallback = mockFsChangeWithCapture()

    const { Wrapper, queryClient } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")
    render(<TestHarness path="/home/user" />, { wrapper: Wrapper })

    await vi.advanceTimersByTimeAsync(0)

    const cb = getCallback()
    cb({ payload: { kind: "Create", paths: ["/home/user/file1.txt"] } })
    cb({ payload: { kind: "Create", paths: ["/home/user/file2.txt"] } })
    cb({ payload: { kind: "Create", paths: ["/home/user/file3.txt"] } })

    expect(invalidateSpy).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(300)

    expect(invalidateSpy).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })

  it("ignores events for unrelated paths", async () => {
    vi.useFakeTimers()
    const getCallback = mockFsChangeWithCapture()

    const { Wrapper, queryClient } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")
    render(<TestHarness path="/home/user" />, { wrapper: Wrapper })

    await vi.advanceTimersByTimeAsync(0)

    getCallback()({ payload: { kind: "Create", paths: ["/other/path/file.txt"] } })

    await vi.advanceTimersByTimeAsync(500)

    expect(invalidateSpy).not.toHaveBeenCalled()
    vi.useRealTimers()
  })

  it("refresh manually invalidates queries", async () => {
    vi.mocked(tauriEvents.fsChange).mockResolvedValue(vi.fn())

    const { Wrapper, queryClient } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")
    const { getByTestId } = render(<TestHarness path="/home/user" />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(tauriClient.watchDirectory).toHaveBeenCalled()
    })

    act(() => {
      getByTestId("refresh").click()
    })

    expect(invalidateSpy).toHaveBeenCalled()
  })
})
