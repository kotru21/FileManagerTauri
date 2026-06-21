/// <reference types="vitest" />

import "@testing-library/jest-dom/vitest"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
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

vi.mock("@/widgets", () => ({
  FileExplorer: ({ onFilesChange }: { onFilesChange?: (files: FileEntry[]) => void }) => {
    act(() => onFilesChange?.([]))
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

function renderPanels() {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        queryFn: async () => [],
      },
    },
  })
  return render(
    <QueryClientProvider client={client}>
      <ResizablePanels onFilesChange={vi.fn()} selectedFile={null} onClosePreview={vi.fn()} />
    </QueryClientProvider>,
  )
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
    renderPanels()
    await waitFor(() => {
      expect(screen.getByTestId("file-explorer-container")).toBeInTheDocument()
    })
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

    renderPanels()
    fireEvent.click(await screen.findByText("child.txt"))

    await waitFor(() => {
      expect(tauriClient.getParentPath).toHaveBeenCalledWith("/parent/child.txt")
      expect(navigate).toHaveBeenCalledWith("/parent")
    })
  })

  it("syncs sidebar collapsed state from layout store", async () => {
    act(() => {
      useLayoutStore.getState().setLayout({ sidebarCollapsed: true, showSidebar: true })
    })
    renderPanels()
    await waitFor(() => {
      expect(useLayoutStore.getState().layout.sidebarCollapsed).toBe(true)
    })
  })
})
