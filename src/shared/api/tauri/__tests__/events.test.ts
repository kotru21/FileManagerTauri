import { listen } from "@tauri-apps/api/event"
import { tauriEvents } from "../events"

describe("tauriEvents", () => {
  const mockUnlisten = vi.fn()

  beforeEach(() => {
    vi.mocked(listen).mockResolvedValue(mockUnlisten)
  })

  it("fsChange calls listen with 'fs-change' event name", async () => {
    const cb = vi.fn()
    const unlisten = await tauriEvents.fsChange(cb)

    expect(listen).toHaveBeenCalledWith("fs-change", cb)
    expect(unlisten).toBe(mockUnlisten)
  })

  it("searchProgress calls listen with 'search-progress' event name", async () => {
    const cb = vi.fn()
    await tauriEvents.searchProgress(cb)

    expect(listen).toHaveBeenCalledWith("search-progress", cb)
  })

  it("searchBatch calls listen with 'search-batch' event name", async () => {
    const cb = vi.fn()
    await tauriEvents.searchBatch(cb)

    expect(listen).toHaveBeenCalledWith("search-batch", cb)
  })

  it("searchComplete calls listen with 'search-complete' event name", async () => {
    const cb = vi.fn()
    await tauriEvents.searchComplete(cb)

    expect(listen).toHaveBeenCalledWith("search-complete", cb)
  })

  it("directoryBatch calls listen with 'directory-batch' event name", async () => {
    const cb = vi.fn()
    await tauriEvents.directoryBatch(cb)

    expect(listen).toHaveBeenCalledWith("directory-batch", cb)
  })

  it("directoryComplete calls listen with 'directory-complete' event name", async () => {
    const cb = vi.fn()
    await tauriEvents.directoryComplete(cb)

    expect(listen).toHaveBeenCalledWith("directory-complete", cb)
  })

  it("copyProgress calls listen with 'copy-progress' event name", async () => {
    const cb = vi.fn()
    await tauriEvents.copyProgress(cb)

    expect(listen).toHaveBeenCalledWith("copy-progress", cb)
  })
})
