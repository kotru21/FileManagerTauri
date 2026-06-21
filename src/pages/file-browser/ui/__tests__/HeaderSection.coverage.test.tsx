/// <reference types="vitest" />

import "@testing-library/jest-dom/vitest"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen } from "@testing-library/react"
import { act } from "react"
import { useInlineEditStore } from "@/features/inline-edit"
import { useNavigationStore } from "@/features/navigation"
import { useSettingsStore } from "@/features/settings"
import { TooltipProvider } from "@/shared/ui"
import { HeaderSection } from "../HeaderSection"

function renderHeader() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, queryFn: async () => [] } },
  })
  return render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <HeaderSection />
      </TooltipProvider>
    </QueryClientProvider>,
  )
}

describe("HeaderSection coverage", () => {
  beforeEach(() => {
    act(() => {
      useNavigationStore.setState({
        currentPath: "/workspace",
        history: ["/workspace"],
        historyIndex: 0,
      })
      useSettingsStore.getState().resetSettings()
      useSettingsStore.getState().updateLayout({ showBreadcrumbs: true, showToolbar: true })
      useInlineEditStore.getState().reset()
    })
  })

  it("renders breadcrumbs and toolbar when enabled", () => {
    const { container } = renderHeader()
    expect(container.querySelector('[data-slot="breadcrumbs"]')).toBeInTheDocument()
    expect(container.querySelector('[data-slot="toolbar"]')).toBeInTheDocument()
  })

  it("toolbar actions start inline edit flows", () => {
    renderHeader()
    fireEvent.click(screen.getByTitle("New folder"))
    expect(useInlineEditStore.getState().parentPath).toBe("/workspace")

    act(() => useInlineEditStore.getState().reset())
    fireEvent.click(screen.getByTitle("New file"))
    expect(useInlineEditStore.getState().parentPath).toBe("/workspace")
  })
})
