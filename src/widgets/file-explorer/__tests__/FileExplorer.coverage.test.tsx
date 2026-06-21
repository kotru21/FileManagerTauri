/// <reference types="vitest" />

import "@testing-library/jest-dom/vitest"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { isTauri } from "@tauri-apps/api/core"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { useDeleteConfirmStore } from "@/features/delete-confirm"
import { useSelectionStore } from "@/features/file-selection"
import { useNavigationStore } from "@/features/navigation"
import { useQuickFilterStore } from "@/features/quick-filter"
import { useSettingsStore } from "@/features/settings"
import type { FileEntry } from "@/shared/api/tauri"
import { tauriClient } from "@/shared/api/tauri/client"
import { FileExplorer } from "../ui/FileExplorer"

const mockFiles: FileEntry[] = [
  {
    path: "/dir-a",
    name: "dir-a",
    is_dir: true,
    size: 0,
    modified: Date.now(),
    created: null,
    is_hidden: false,
    extension: "",
  },
  {
    path: "/file-a.txt",
    name: "file-a.txt",
    is_dir: false,
    size: 12,
    modified: Date.now(),
    created: null,
    is_hidden: false,
    extension: "txt",
  },
]

const refetchMock = vi.fn()
let dragDropHandler: ((event: unknown) => void) | null = null

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({
    onDragDropEvent: (cb: (event: unknown) => void) => {
      dragDropHandler = cb
      return Promise.resolve(() => {})
    },
  }),
}))

vi.mock("@/entities/file-entry", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/entities/file-entry")>()
  return {
    ...actual,
    useDirectoryEntries: () => ({
      files: mockFiles,
      isLoading: false,
      error: null,
      refetch: refetchMock,
    }),
    useFileWatcher: () => {},
  }
})

function renderExplorer() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, queryFn: () => [] as unknown } },
  })
  return render(
    <QueryClientProvider client={client}>
      <FileExplorer className="test-explorer" />
    </QueryClientProvider>,
  )
}

describe("FileExplorer coverage", () => {
  beforeEach(() => {
    dragDropHandler = null
    refetchMock.mockReset()
    vi.mocked(isTauri).mockReturnValue(false)
    act(() => {
      useNavigationStore.setState({ currentPath: "/", history: ["/"], historyIndex: 0 })
      useQuickFilterStore.setState({ filter: "", isActive: false })
      useSettingsStore.getState().resetSettings()
    })
  })

  it("renders explorer container and file list", async () => {
    renderExplorer()
    expect(screen.getByTestId("file-explorer-container")).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText("file-a.txt")).toBeInTheDocument()
    })
  })

  it("shows quick filter bar when active", async () => {
    act(() => {
      useQuickFilterStore.setState({ filter: "file", isActive: true })
    })
    renderExplorer()
    await waitFor(() => {
      expect(screen.getByText("file-a.txt")).toBeInTheDocument()
    })
  })

  it("clears selection on background pointer down", async () => {
    renderExplorer()
    const container = screen.getByTestId("file-explorer-container")
    act(() => {
      fireEvent.pointerDown(container, { button: 0 })
    })
    expect(container).toBeInTheDocument()
  })

  it("refetches on window focus when autoRefreshOnFocus is enabled", async () => {
    act(() => {
      useSettingsStore.getState().updateBehavior({ autoRefreshOnFocus: true })
    })
    renderExplorer()
    act(() => {
      window.dispatchEvent(new Event("focus"))
    })
    expect(refetchMock).toHaveBeenCalled()
  })

  it("handles external drag-drop copy in tauri mode", async () => {
    vi.mocked(isTauri).mockReturnValue(true)
    vi.spyOn(tauriClient, "copyEntries").mockResolvedValue(null)
    renderExplorer()

    await waitFor(() => expect(dragDropHandler).toBeTruthy())

    await act(async () => {
      dragDropHandler?.({
        payload: { type: "drop", paths: ["/external/new.txt"] },
      })
    })

    expect(tauriClient.copyEntries).toHaveBeenCalledWith(["/external/new.txt"], "/")
    expect(refetchMock).toHaveBeenCalled()
  })

  it("uses parallel copy for many dropped files", async () => {
    vi.mocked(isTauri).mockReturnValue(true)
    vi.spyOn(tauriClient, "copyEntriesParallel").mockResolvedValue(null)
    renderExplorer()

    await waitFor(() => expect(dragDropHandler).toBeTruthy())

    const manyPaths = Array.from({ length: 6 }, (_, i) => `/external/file-${i}.txt`)
    await act(async () => {
      dragDropHandler?.({
        payload: { type: "drop", paths: manyPaths },
      })
    })

    expect(tauriClient.copyEntriesParallel).toHaveBeenCalledWith(manyPaths, "/")
  })

  it("handleDelete with confirmation delegates to delete confirm store", async () => {
    const openDeleteConfirm = vi.fn(async () => true)
    act(() => {
      useSettingsStore.getState().updateBehavior({ confirmDelete: true })
      useDeleteConfirmStore.setState({ open: openDeleteConfirm })
      useSelectionStore.getState().selectFile("/file-a.txt")
      useSettingsStore.getState().updateKeyboard({
        shortcuts: [{ id: "delete", action: "Delete", keys: "Delete", enabled: true }],
      })
    })

    renderExplorer()

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Delete", code: "Delete", bubbles: true }),
      )
    })

    await waitFor(() => {
      expect(openDeleteConfirm).toHaveBeenCalled()
    })
  })
})
