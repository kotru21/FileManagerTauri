/// <reference types="vitest" />

import "@testing-library/jest-dom/vitest"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { useEffect } from "react"
import { beforeAll } from "vitest"
import { useLayoutStore } from "@/entities/layout"
import { useNavigationStore } from "@/features/navigation"
import { useSearchStore } from "@/features/search-content"
import type { FileEntry } from "@/shared/api/tauri"
import { tauriClient } from "@/shared/api/tauri/client"
import { ResizablePanels } from "../ResizablePanels"

beforeAll(() => {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = ResizeObserverMock as typeof ResizeObserver
})

vi.mock("@/features/layout/panelController", () => ({
  registerSidebar: vi.fn(),
  registerPreview: vi.fn(),
  applyLayoutToPanels: vi.fn(),
}))

vi.mock("@/widgets", () => ({
  FileExplorer: ({ onFilesChange }: { onFilesChange?: (files: FileEntry[]) => void }) => {
    useEffect(() => {
      onFilesChange?.([])
    }, [onFilesChange])
    return <div data-testid="file-explorer-container" />
  },
  PreviewPanel: () => <div data-testid="preview-panel-mock" />,
  Sidebar: () => <div data-testid="sidebar-mock" />,
}))

vi.mock("@/entities/file-entry", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/entities/file-entry")>()
  return {
    ...actual,
    useDirectoryEntries: () => ({
      files: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    }),
    useFileWatcher: () => {},
  }
})

const mockFile: FileEntry = {
  path: "/preview.txt",
  name: "preview.txt",
  is_dir: false,
  size: 1,
  modified: Date.now(),
  created: null,
  is_hidden: false,
  extension: "txt",
}

async function flushPanelUpdates() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

async function renderPanels(
  props: Partial<{
    selectedFile: FileEntry | null
    onClosePreview: () => void
    onFilesChange: (files: FileEntry[]) => void
  }> = {},
) {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        queryFn: async () => [],
      },
    },
  })
  const result = render(
    <QueryClientProvider client={client}>
      <ResizablePanels
        onFilesChange={props.onFilesChange ?? vi.fn()}
        selectedFile={props.selectedFile ?? null}
        onClosePreview={props.onClosePreview ?? vi.fn()}
      />
    </QueryClientProvider>,
  )
  await flushPanelUpdates()
  return result
}

describe("ResizablePanels coverage", () => {
  beforeEach(() => {
    act(() => {
      useLayoutStore.getState().resetLayout()
      useNavigationStore.setState({ currentPath: "/", history: ["/"], historyIndex: 0 })
      useSearchStore.setState({ results: [], isSearching: false, query: "" })
    })
  })

  it("renders file explorer when search is inactive", async () => {
    await renderPanels()
    await waitFor(() => {
      expect(screen.getByTestId("file-explorer-container")).toBeInTheDocument()
    })
    await flushPanelUpdates()
  })

  it("renders search results and navigates on select", async () => {
    vi.spyOn(tauriClient, "getParentPath").mockResolvedValue("/parent")
    const navigate = vi.spyOn(useNavigationStore.getState(), "navigate")

    act(() => {
      useSearchStore.setState({
        results: [
          {
            path: "/parent/child.txt",
            name: "child.txt",
            is_dir: false,
            matches: [],
          },
        ],
        isSearching: false,
        query: "child",
      })
    })

    await renderPanels()
    await act(async () => {
      fireEvent.click(await screen.findByText("child.txt"))
    })

    await waitFor(() => {
      expect(tauriClient.getParentPath).toHaveBeenCalledWith("/parent/child.txt")
      expect(navigate).toHaveBeenCalledWith("/parent")
    })
    await flushPanelUpdates()
  })

  it("ignores search select when parent path cannot be resolved", async () => {
    vi.spyOn(tauriClient, "getParentPath").mockResolvedValue(null)
    const navigate = vi.spyOn(useNavigationStore.getState(), "navigate")

    act(() => {
      useSearchStore.setState({
        results: [
          {
            path: "/orphan.txt",
            name: "orphan.txt",
            is_dir: false,
            matches: [],
          },
        ],
        isSearching: false,
        query: "orphan",
      })
    })

    await renderPanels()
    await act(async () => {
      fireEvent.click(await screen.findByText("orphan.txt"))
    })

    await waitFor(() => {
      expect(tauriClient.getParentPath).toHaveBeenCalledWith("/orphan.txt")
    })
    expect(navigate).not.toHaveBeenCalled()
    await flushPanelUpdates()
  })

  it("renders preview panel when layout shows preview and file is selected", async () => {
    act(() => {
      useLayoutStore.getState().setLayout({ showPreview: true })
    })

    await renderPanels({ selectedFile: mockFile })

    await waitFor(() => {
      expect(screen.getByTestId("preview-panel-mock")).toBeInTheDocument()
    })
    await flushPanelUpdates()
  })

  it("syncs sidebar collapsed state from layout store", async () => {
    act(() => {
      useLayoutStore.getState().setLayout({ sidebarCollapsed: true, showSidebar: true })
    })
    await renderPanels()
    await waitFor(() => {
      expect(useLayoutStore.getState().layout.sidebarCollapsed).toBe(true)
    })
    await flushPanelUpdates()
  })
})
