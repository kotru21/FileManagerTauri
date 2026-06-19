import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"
import { useDirectoryEntries } from "../useDirectoryEntries"

const entry = {
  path: "C:/test/a.txt",
  name: "a.txt",
  is_dir: false,
  size: 1,
  modified: 0,
  created: 0,
  extension: "txt",
}

let batchCb:
  | ((event: { payload: { request_id: string; path: string; entries: (typeof entry)[] } }) => void)
  | null = null
let completeCb: ((event: { payload: { request_id: string; path: string } }) => void) | null = null

vi.mock("@/shared/api/tauri/client", () => ({
  tauriClient: {
    readDirectoryStream: vi.fn().mockImplementation(async (path: string, requestId: string) => {
      batchCb?.({ payload: { request_id: requestId, path, entries: [entry] } })
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
    const qc = new QueryClient()
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    )
    const { result } = renderHook(() => useDirectoryEntries("C:/test"), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.files.length).toBeGreaterThan(0)
  })
})
