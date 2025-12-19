/// <reference types="vitest" />

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
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

describe("Toolbar a11y", () => {
  it("has aria-labels on key buttons", () => {
    renderWithProviders(
      <Toolbar onRefresh={() => {}} onNewFolder={() => {}} onNewFile={() => {}} />,
    )

    expect(screen.getByLabelText("Быстрый фильтр")).toBeTruthy()
    expect(screen.getByLabelText("Настройки")).toBeTruthy()
    expect(screen.getByLabelText("Поиск")).toBeTruthy()
  })
})
