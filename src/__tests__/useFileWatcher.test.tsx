/// <reference types="vitest" />

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { listen } from "@tauri-apps/api/event"
import { renderHook, waitFor } from "@testing-library/react"
import type { PropsWithChildren } from "react"
import { useFileWatcher } from "@/entities/file-entry/api/useFileWatcher"
import { commands } from "@/shared/api/tauri"

vi.mock("@tauri-apps/api/event")
vi.mock("@/shared/api/tauri")

describe("useFileWatcher", () => {
  let queryClient: QueryClient
  let wrapper: (props: PropsWithChildren) => JSX.Element
  beforeEach(() => {
    queryClient = new QueryClient()
    wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    ;(
      listen as unknown as {
        mockResolvedValue: (value: unknown) => void
      }
    ).mockResolvedValue(vi.fn(() => {}))
    ;(
      commands.watchDirectory as unknown as {
        mockResolvedValue: (value: unknown) => void
      }
    ).mockResolvedValue(null)
    ;(
      commands.unwatchDirectory as unknown as {
        mockResolvedValue: (value: unknown) => void
      }
    ).mockResolvedValue(null)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("registers listener and calls unlisten on unmount", async () => {
    const { unmount } = renderHook(() => useFileWatcher("/tmp"), {
      wrapper,
    })
    await waitFor(() => expect(listen).toHaveBeenCalled())
    unmount()
    // assert unwatchDirectory called
    expect(commands.unwatchDirectory).toHaveBeenCalled()
  })
})
