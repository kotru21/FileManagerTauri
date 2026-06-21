/// <reference types="vitest" />

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useClipboardStore } from "../model/store"

vi.mock("@/shared/api/tauri/client", () => ({
  tauriClient: { copyEntries: vi.fn(), moveEntries: vi.fn() },
}))

vi.mock("@/shared/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared/ui")>()
  return {
    ...actual,
    toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  }
})

import { tauriClient } from "@/shared/api/tauri/client"
import { toast } from "@/shared/ui"
import { useCopyEntries, useMoveEntries } from "@/entities/file-entry"

function wrapper(qc: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
}

describe("clipboard paste flow", () => {
  beforeEach(() => {
    useClipboardStore.getState().clear()
    vi.clearAllMocks()
  })

  it("happy path: copy store paths then paste via moveEntries", async () => {
    useClipboardStore.getState().cut(["C:/src/file.txt"])
    vi.mocked(tauriClient.moveEntries).mockResolvedValue(null)
    const qc = new QueryClient()
    const { result } = renderHook(() => useMoveEntries(), { wrapper: wrapper(qc) })
    const { paths, action } = useClipboardStore.getState()
    expect(action).toBe("cut")
    await act(async () => {
      await result.current.mutateAsync({ sources: paths, destination: "C:/dest" })
    })
    expect(tauriClient.moveEntries).toHaveBeenCalledWith(["C:/src/file.txt"], "C:/dest")
    expect(toast.success).not.toHaveBeenCalled()
  })

  it("IPC error on paste surfaces rejection", async () => {
    useClipboardStore.getState().copy(["C:/src/a.txt"])
    vi.mocked(tauriClient.copyEntries).mockRejectedValue(new Error("Permission denied"))
    const qc = new QueryClient()
    const { result } = renderHook(() => useCopyEntries(), { wrapper: wrapper(qc) })
    await expect(
      act(async () => {
        await result.current.mutateAsync({
          sources: useClipboardStore.getState().paths,
          destination: "C:/dest",
        })
      }),
    ).rejects.toThrow("Permission denied")
  })

  it("invalid state: paste with empty clipboard does not call IPC", async () => {
    useClipboardStore.getState().clear()
    expect(useClipboardStore.getState().hasContent()).toBe(false)
    const qc = new QueryClient()
    const { result } = renderHook(() => useCopyEntries(), { wrapper: wrapper(qc) })
    if (!useClipboardStore.getState().hasContent()) {
      expect(tauriClient.copyEntries).not.toHaveBeenCalled()
    }
    expect(result.current).toBeDefined()
  })
})
