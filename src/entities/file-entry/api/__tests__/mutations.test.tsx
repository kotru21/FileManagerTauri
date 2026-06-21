import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  useCopyEntries,
  useDeleteEntries,
  useMoveEntries,
  useRenameEntry,
} from "../mutations"

vi.mock("@/shared/api/tauri/client", () => ({
  tauriClient: {
    deleteEntries: vi.fn(),
    renameEntry: vi.fn(),
    copyEntries: vi.fn(),
    moveEntries: vi.fn(),
  },
}))

vi.mock("../invalidateDirectory", () => ({
  invalidateAffectedDirectories: vi.fn(),
}))

import { tauriClient } from "@/shared/api/tauri/client"
import { invalidateAffectedDirectories } from "../invalidateDirectory"

function wrapper(qc: QueryClient) {
  return function W({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  }
}

describe("useDeleteEntries", () => {
  beforeEach(() => vi.clearAllMocks())

  it("happy path: calls IPC and invalidates directories", async () => {
    vi.mocked(tauriClient.deleteEntries).mockResolvedValue(null)
    const qc = new QueryClient()
    const { result } = renderHook(() => useDeleteEntries(), { wrapper: wrapper(qc) })
    await act(async () => {
      await result.current.mutateAsync({ paths: ["C:/test/a.txt"] })
    })
    expect(tauriClient.deleteEntries).toHaveBeenCalledWith(["C:/test/a.txt"])
    expect(invalidateAffectedDirectories).toHaveBeenCalled()
  })

  it("IPC error: propagates rejection", async () => {
    vi.mocked(tauriClient.deleteEntries).mockRejectedValue(new Error("Access denied"))
    const qc = new QueryClient()
    const { result } = renderHook(() => useDeleteEntries(), { wrapper: wrapper(qc) })
    await expect(
      act(async () => {
        await result.current.mutateAsync({ paths: ["C:/test/a.txt"] })
      }),
    ).rejects.toThrow("Access denied")
  })

  it("invalid state: empty paths still calls IPC (backend validates)", async () => {
    vi.mocked(tauriClient.deleteEntries).mockResolvedValue(null)
    const qc = new QueryClient()
    const { result } = renderHook(() => useDeleteEntries(), { wrapper: wrapper(qc) })
    await act(async () => {
      await result.current.mutateAsync({ paths: [] })
    })
    expect(tauriClient.deleteEntries).toHaveBeenCalledWith([])
  })
})

describe("useRenameEntry", () => {
  beforeEach(() => vi.clearAllMocks())

  it("happy path: renames and invalidates", async () => {
    vi.mocked(tauriClient.renameEntry).mockResolvedValue("C:/test/renamed.txt")
    const qc = new QueryClient()
    const { result } = renderHook(() => useRenameEntry(), { wrapper: wrapper(qc) })
    await act(async () => {
      await result.current.mutateAsync({ oldPath: "C:/test/a.txt", newName: "renamed.txt" })
    })
    expect(tauriClient.renameEntry).toHaveBeenCalledWith("C:/test/a.txt", "renamed.txt")
    expect(invalidateAffectedDirectories).toHaveBeenCalled()
  })

  it("IPC error: propagates rejection", async () => {
    vi.mocked(tauriClient.renameEntry).mockRejectedValue(new Error("File exists"))
    const qc = new QueryClient()
    const { result } = renderHook(() => useRenameEntry(), { wrapper: wrapper(qc) })
    await expect(
      act(async () => {
        await result.current.mutateAsync({ oldPath: "C:/test/a.txt", newName: "renamed.txt" })
      }),
    ).rejects.toThrow("File exists")
  })

  it("invalid state: empty newName still calls IPC (backend validates)", async () => {
    vi.mocked(tauriClient.renameEntry).mockResolvedValue("C:/test/")
    const qc = new QueryClient()
    const { result } = renderHook(() => useRenameEntry(), { wrapper: wrapper(qc) })
    await act(async () => {
      await result.current.mutateAsync({ oldPath: "C:/test/a.txt", newName: "" })
    })
    expect(tauriClient.renameEntry).toHaveBeenCalledWith("C:/test/a.txt", "")
  })
})

describe("useCopyEntries", () => {
  beforeEach(() => vi.clearAllMocks())

  it("happy path: copies and invalidates", async () => {
    vi.mocked(tauriClient.copyEntries).mockResolvedValue(null)
    const qc = new QueryClient()
    const { result } = renderHook(() => useCopyEntries(), { wrapper: wrapper(qc) })
    await act(async () => {
      await result.current.mutateAsync({
        sources: ["C:/src/a.txt"],
        destination: "C:/dest",
      })
    })
    expect(tauriClient.copyEntries).toHaveBeenCalledWith(["C:/src/a.txt"], "C:/dest")
    expect(invalidateAffectedDirectories).toHaveBeenCalled()
  })

  it("IPC error: propagates rejection", async () => {
    vi.mocked(tauriClient.copyEntries).mockRejectedValue(new Error("disk full"))
    const qc = new QueryClient()
    const { result } = renderHook(() => useCopyEntries(), { wrapper: wrapper(qc) })
    await expect(
      act(async () => {
        await result.current.mutateAsync({ sources: ["C:/src/a.txt"], destination: "C:/dest" })
      }),
    ).rejects.toThrow("disk full")
  })

  it("invalid state: empty sources still calls IPC (backend validates)", async () => {
    vi.mocked(tauriClient.copyEntries).mockResolvedValue(null)
    const qc = new QueryClient()
    const { result } = renderHook(() => useCopyEntries(), { wrapper: wrapper(qc) })
    await act(async () => {
      await result.current.mutateAsync({ sources: [], destination: "C:/dest" })
    })
    expect(tauriClient.copyEntries).toHaveBeenCalledWith([], "C:/dest")
  })
})

describe("useMoveEntries", () => {
  beforeEach(() => vi.clearAllMocks())

  it("happy path: moves and invalidates", async () => {
    vi.mocked(tauriClient.moveEntries).mockResolvedValue(null)
    const qc = new QueryClient()
    const { result } = renderHook(() => useMoveEntries(), { wrapper: wrapper(qc) })
    await act(async () => {
      await result.current.mutateAsync({
        sources: ["C:/a.txt"],
        destination: "C:/b",
      })
    })
    expect(tauriClient.moveEntries).toHaveBeenCalledWith(["C:/a.txt"], "C:/b")
    expect(invalidateAffectedDirectories).toHaveBeenCalled()
  })

  it("IPC error: propagates rejection", async () => {
    vi.mocked(tauriClient.moveEntries).mockRejectedValue(new Error("disk full"))
    const qc = new QueryClient()
    const { result } = renderHook(() => useMoveEntries(), { wrapper: wrapper(qc) })
    await expect(
      act(async () => {
        await result.current.mutateAsync({ sources: ["C:/a"], destination: "C:/b" })
      }),
    ).rejects.toThrow("disk full")
  })

  it("invalid state: empty sources still calls IPC (backend validates)", async () => {
    vi.mocked(tauriClient.moveEntries).mockResolvedValue(null)
    const qc = new QueryClient()
    const { result } = renderHook(() => useMoveEntries(), { wrapper: wrapper(qc) })
    await act(async () => {
      await result.current.mutateAsync({ sources: [], destination: "C:/b" })
    })
    expect(tauriClient.moveEntries).toHaveBeenCalledWith([], "C:/b")
  })
})
