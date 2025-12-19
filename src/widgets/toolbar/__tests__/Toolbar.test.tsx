/// <reference types="vitest" />

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import { useQuickFilterStore } from "@/features/quick-filter"
import { TooltipProvider } from "@/shared/ui"
import { Toolbar } from "@/widgets/toolbar"

function renderWithProviders(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, queryFn: () => [] as unknown } },
  })
  return render(
    <QueryClientProvider client={client}>
      <TooltipProvider>{ui}</TooltipProvider>
    </QueryClientProvider>,
  )
}

describe("Toolbar", () => {
  beforeEach(() => {
    // Reset quick filter store
    useQuickFilterStore.setState({ filter: "", isActive: false })
  })

  it("toggles quick filter when button is clicked", () => {
    renderWithProviders(
      <Toolbar onRefresh={() => {}} onNewFolder={() => {}} onNewFile={() => {}} />,
    )

    const btn = screen.getByLabelText("Быстрый фильтр")
    expect(useQuickFilterStore.getState().isActive).toBe(false)

    fireEvent.click(btn)
    expect(useQuickFilterStore.getState().isActive).toBe(true)

    fireEvent.click(btn)
    expect(useQuickFilterStore.getState().isActive).toBe(false)
  })
})
