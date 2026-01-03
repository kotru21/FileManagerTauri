/// <reference types="vitest" />

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, waitFor } from "@testing-library/react"
import { act } from "react"
import { beforeEach, describe, expect, it } from "vitest"
import { useLayoutStore } from "@/entities/layout"
import { useLayoutSettings, useSettingsStore } from "@/features/settings"
import { useSyncLayoutWithSettings } from "@/pages/file-browser/hooks/useSyncLayoutWithSettings"

function renderWithProviders(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        // Provide a safe default query function to avoid tests failing when a real queryFn
        // is not provided in mocks (returns an empty array)
        queryFn: () => [] as unknown,
      },
    },
  })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

function TestHarness() {
  useSyncLayoutWithSettings()
  return <div data-testid="harness" />
}

function CompactTest() {
  const layout = useLayoutSettings()
  return <div data-testid="root" className={layout.compactMode ? "compact-mode" : ""} />
}

describe("FileBrowserPage layout sync", () => {
  beforeEach(() => {
    // Reset stores to defaults
    useSettingsStore.getState().resetSettings()
    useLayoutStore.getState().resetLayout()
  })

  it("column widths are stored in layoutStore", async () => {
    const { container } = renderWithProviders(<TestHarness />)

    act(() => {
      useLayoutStore.getState().setColumnWidth("size", 120)
      useLayoutStore.getState().setColumnWidth("date", 160)
      useLayoutStore.getState().setColumnWidth("padding", 12)
    })

    await waitFor(() => {
      const cw = useLayoutStore.getState().layout.columnWidths
      expect(cw.size).toBe(120)
      expect(cw.date).toBe(160)
      expect(cw.padding).toBe(12)
    })

    container.remove()
  })

  it("applies compact mode class to root when enabled in settings", async () => {
    const { container } = renderWithProviders(<CompactTest />)

    act(() => {
      useSettingsStore.getState().updateLayout({ compactMode: true })
    })

    await waitFor(() => {
      expect(container.querySelector(".compact-mode")).toBeTruthy()
    })

    container.remove()
  })
})
