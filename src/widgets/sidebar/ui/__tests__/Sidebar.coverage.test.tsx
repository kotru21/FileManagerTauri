/// <reference types="vitest" />

import "@testing-library/jest-dom/vitest"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { homeDir } from "@tauri-apps/api/path"
import { useNavigationStore } from "@/features/navigation"
import { TooltipProvider } from "@/shared/ui"
import { Sidebar } from "../Sidebar"

vi.mock("@tauri-apps/api/path", () => ({
  homeDir: vi.fn(async () => "C:/Users/test"),
}))

vi.mock("@/entities/file-entry", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/entities/file-entry")>()
  return {
    ...actual,
    useDrives: () => ({
      data: [{ name: "C:", path: "C:/", label: "Local Disk" }],
      isLoading: false,
    }),
  }
})

function renderSidebar(collapsed = false) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, queryFn: async () => [] } },
  })
  return render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <Sidebar collapsed={collapsed} />
      </TooltipProvider>
    </QueryClientProvider>,
  )
}

describe("Sidebar coverage", () => {
  beforeEach(() => {
    vi.mocked(homeDir).mockResolvedValue("C:/Users/test")
    act(() => {
      useNavigationStore.setState({ currentPath: "C:/", history: ["C:/"], historyIndex: 0 })
    })
  })

  it("renders expanded sections and navigates home", async () => {
    renderSidebar(false)
    const home = await screen.findByText("Домой")
    fireEvent.click(home)
    await waitFor(() => {
      expect(useNavigationStore.getState().currentPath).toBe("C:/Users/test")
    })
  })

  it("renders collapsed mode with home shortcut", async () => {
    renderSidebar(true)
    const home = await screen.findByLabelText("Домой")
    expect(home).toBeInTheDocument()
  })
})
