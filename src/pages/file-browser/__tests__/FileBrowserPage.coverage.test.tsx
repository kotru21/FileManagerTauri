/// <reference types="vitest" />

import "@testing-library/jest-dom/vitest"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { homeDir } from "@tauri-apps/api/path"
import { act, render, waitFor } from "@testing-library/react"
import { useEffect } from "react"
import { useLayoutStore } from "@/entities/layout"
import { useSelectionStore } from "@/features/file-selection"
import { useNavigationStore } from "@/features/navigation"
import { useTabsStore } from "@/features/tabs"
import type { FileEntry } from "@/shared/api/tauri"
import { tauriClient } from "@/shared/api/tauri/client"
import { FileBrowserPage } from "../ui/FileBrowserPage"

const mockFiles: FileEntry[] = [
  {
    path: "/picked.txt",
    name: "picked.txt",
    is_dir: false,
    size: 1,
    modified: Date.now(),
    created: null,
    is_hidden: false,
    extension: "txt",
  },
]

vi.mock("@tauri-apps/api/path", () => ({
  homeDir: vi.fn(async () => "C:/Users/test"),
}))

vi.mock("@/processes/command-palette", () => ({
  useRegisterCommands: vi.fn(),
}))

vi.mock("../ui/ResizablePanels", () => ({
  ResizablePanels: ({ onFilesChange }: { onFilesChange: (files: FileEntry[]) => void }) => {
    useEffect(() => {
      onFilesChange(mockFiles)
    }, [onFilesChange])
    return <div data-testid="resizable-panels-mock" />
  },
}))

vi.mock("../ui/HeaderSection", () => ({
  HeaderSection: () => <div data-testid="header-section-mock" />,
}))

vi.mock("../ui/TabBarSection", () => ({
  TabBarSection: () => <div data-testid="tab-bar-mock" />,
}))

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, queryFn: () => [] as unknown } },
  })
  return render(
    <QueryClientProvider client={client}>
      <FileBrowserPage />
    </QueryClientProvider>,
  )
}

async function renderPageAndSettle() {
  renderPage()
  await waitFor(() => {
    expect(useNavigationStore.getState().currentPath).toBeTruthy()
  })
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

describe("FileBrowserPage coverage", () => {
  beforeEach(() => {
    act(() => {
      useNavigationStore.setState({ currentPath: null, history: [], historyIndex: 0 })
      useTabsStore.setState({ tabs: [], activeTabId: null })
      useSelectionStore.getState().clearSelection()
      useLayoutStore.getState().resetLayout()
    })
    vi.mocked(homeDir).mockResolvedValue("C:/Users/test")
    vi.spyOn(tauriClient, "getDrives").mockResolvedValue([
      {
        name: "C:",
        path: "C:/",
        total_space: 500_000_000_000,
        free_space: 200_000_000_000,
        drive_type: "Fixed",
      },
    ])
  })

  it("renders page shell and resolves initial path from homeDir", async () => {
    await renderPageAndSettle()
    expect(useNavigationStore.getState().currentPath).toBe("C:/Users/test")
  })

  it("falls back to first drive when homeDir fails", async () => {
    vi.mocked(homeDir).mockRejectedValue(new Error("no home"))
    await renderPageAndSettle()
    expect(useNavigationStore.getState().currentPath).toBe("C:/")
  })

  it("creates a tab when path is available", async () => {
    act(() => {
      useNavigationStore.setState({
        currentPath: "/workspace",
        history: ["/workspace"],
        historyIndex: 0,
      })
    })
    renderPage()
    await waitFor(() => {
      expect(useTabsStore.getState().tabs.length).toBeGreaterThan(0)
    })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  })

  it("shows preview panel when a file is selected", async () => {
    act(() => {
      useNavigationStore.setState({ currentPath: "/", history: ["/"], historyIndex: 0 })
      useLayoutStore.getState().setLayout({ showPreview: false })
    })
    await renderPageAndSettle()

    act(() => {
      useSelectionStore.getState().selectFile("/picked.txt")
    })

    await waitFor(() => {
      expect(useLayoutStore.getState().layout.showPreview).toBe(true)
    })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  })
})
