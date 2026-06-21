/// <reference types="vitest" />

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import type { FileEntry } from "@/shared/api/tauri"
import { setLastNav } from "@/shared/lib/devLogger"
import { useFileExplorerLogic } from "../useFileExplorerLogic"

const rawFiles: FileEntry[] = [
  {
    path: "/a.txt",
    name: "a.txt",
    is_dir: false,
    size: 5,
    modified: 100,
    created: null,
    is_hidden: false,
    extension: "txt",
  },
  {
    path: "/hidden",
    name: "hidden",
    is_dir: true,
    size: 0,
    modified: 100,
    created: null,
    is_hidden: true,
    extension: "",
  },
]

vi.mock("@/entities/file-entry", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/entities/file-entry")>()
  return {
    ...actual,
    useDirectoryEntries: () => ({
      files: rawFiles,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    }),
    useCreateDirectory: () => ({ mutateAsync: vi.fn() }),
    useCreateFile: () => ({ mutateAsync: vi.fn() }),
    useRenameEntry: () => ({ mutateAsync: vi.fn() }),
    useDeleteEntries: () => ({ mutateAsync: vi.fn() }),
    useCopyEntries: () => ({ mutateAsync: vi.fn() }),
    useMoveEntries: () => ({ mutateAsync: vi.fn() }),
  }
})

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, queryFn: () => [] as unknown } },
  })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe("useFileExplorerLogic coverage", () => {
  beforeEach(() => {
    ;(globalThis as { __fm_perfEnabled?: boolean }).__fm_perfEnabled = true
  })

  it("filters hidden files and exposes handlers", async () => {
    const onFilesChange = vi.fn()
    const { result } = renderHook(() => useFileExplorerLogic("/", onFilesChange), { wrapper })

    await waitFor(() => {
      expect(result.current.files).toHaveLength(1)
      expect(result.current.files[0]?.name).toBe("a.txt")
    })

    expect(result.current.handlers.handleCopy).toBeTypeOf("function")
    expect(onFilesChange).toHaveBeenCalled()
  })

  it("records perf log when navigation context exists", async () => {
    act(() => {
      setLastNav({ id: "nav-1", path: "/", t: performance.now() })
    })

    const { result } = renderHook(() => useFileExplorerLogic("/", undefined), { wrapper })

    await waitFor(() => {
      expect(result.current.processedFilesCount).toBe(1)
    })
  })

  it("opens copy dialog via onStartCopyWithProgress path", async () => {
    const { result } = renderHook(() => useFileExplorerLogic("/", undefined), { wrapper })

    await waitFor(() => expect(result.current.files.length).toBeGreaterThan(0))

    act(() => {
      result.current.handlers.handlePaste()
    })
  })
})
