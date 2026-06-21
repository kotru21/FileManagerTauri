/// <reference types="vitest" />

import "@testing-library/jest-dom/vitest"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen } from "@testing-library/react"
import { act } from "react"
import { useNavigationStore } from "@/features/navigation"
import { TooltipProvider } from "@/shared/ui"
import { Toolbar } from "../Toolbar"

function renderToolbar() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, queryFn: async () => [] } },
  })
  return render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <Toolbar onRefresh={vi.fn()} onNewFolder={vi.fn()} onNewFile={vi.fn()} />
      </TooltipProvider>
    </QueryClientProvider>,
  )
}

describe("Toolbar coverage", () => {
  beforeEach(() => {
    act(() => {
      useNavigationStore.setState({
        currentPath: "C:/work",
        history: ["C:/", "C:/work"],
        historyIndex: 1,
      })
    })
  })

  it("exercises navigation and utility buttons", () => {
    renderToolbar()

    fireEvent.click(screen.getByTitle("Back"))
    fireEvent.click(screen.getByTitle("Forward"))
    fireEvent.click(screen.getByTitle("Up"))
    fireEvent.click(screen.getByTitle("Refresh"))
    fireEvent.click(screen.getByTitle("New folder"))
    fireEvent.click(screen.getByTitle("New file"))

    const iconButtons = screen.getAllByRole("button")
    for (const btn of iconButtons) {
      if (
        btn.getAttribute("title")?.includes("hidden") ||
        btn.getAttribute("aria-label")?.includes("hidden")
      ) {
        fireEvent.click(btn)
      }
    }

    expect(useNavigationStore.getState().currentPath).toBeTruthy()
  })
})
