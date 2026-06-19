import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"
import { fileKeys } from "../keys"
import { useDirectoryEntries } from "../useDirectoryEntries"

const entryA = {
  path: "C:/test/a.txt",
  name: "a.txt",
  is_dir: false,
  size: 1,
  modified: 0,
  created: 0,
  extension: "txt",
}

const entryB = {
  path: "C:/test/b.txt",
  name: "b.txt",
  is_dir: false,
  size: 2,
  modified: 0,
  created: 0,
  extension: "txt",
}

let streamEntries = [entryA]

let batchCb:
  | ((event: { payload: { request_id: string; path: string; entries: (typeof entryA)[] } }) => void)
  | null = null
let completeCb: ((event: { payload: { request_id: string; path: string } }) => void) | null = null

vi.mock("@/shared/api/tauri/client", () => ({
  tauriClient: {
    readDirectoryStream: vi.fn().mockImplementation(async (path: string, requestId: string) => {
      batchCb?.({ payload: { request_id: requestId, path, entries: streamEntries } })
      completeCb?.({ payload: { request_id: requestId, path } })
    }),
  },
}))

vi.mock("@/shared/api/tauri", () => ({
  tauriEvents: {
    directoryBatch: vi.fn(async (cb) => {
      batchCb = cb
      return () => {}
    }),
    directoryComplete: vi.fn(async (cb) => {
      completeCb = cb
      return () => {}
    }),
  },
}))

describe("useDirectoryEntries", () => {
  it("populates query cache when stream completes", async () => {
    streamEntries = [entryA]
    const qc = new QueryClient()
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    )
    const { result } = renderHook(() => useDirectoryEntries("C:/test"), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.files).toEqual([entryA])
  })

  it("re-streams directory when query cache is invalidated", async () => {
    streamEntries = [entryA]
    const qc = new QueryClient()
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    )
    const { result } = renderHook(() => useDirectoryEntries("C:/test"), { wrapper })
    await waitFor(() => expect(result.current.files).toEqual([entryA]))

    streamEntries = [entryB]
    await act(async () => {
      await qc.invalidateQueries({ queryKey: fileKeys.directory("C:/test") })
    })

    await waitFor(() => expect(result.current.files).toEqual([entryB]))
  })
})
