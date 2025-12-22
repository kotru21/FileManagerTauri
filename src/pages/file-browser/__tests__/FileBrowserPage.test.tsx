/// <reference types="vitest" />

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, waitFor } from "@testing-library/react"
import { act } from "react"
import { beforeEach, describe, expect, it } from "vitest"
import { useLayoutStore } from "@/features/layout"
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

  it("applies panelLayout changes from settings to layout store", async () => {
    const { container } = renderWithProviders(<TestHarness />)

    // initial
    expect(useLayoutStore.getState().layout.showSidebar).toBe(true)

    act(() => {
      useSettingsStore.getState().updateLayout({
        panelLayout: {
          ...useSettingsStore.getState().settings.layout.panelLayout,
          showSidebar: false,
        },
      })
    })

    await waitFor(() => {
      expect(useLayoutStore.getState().layout.showSidebar).toBe(false)
    })

    // cleanup (not strictly necessary because of beforeEach)
    container.remove()
  })

  it("syncs column widths from settings into layout store", async () => {
    const { container } = renderWithProviders(<TestHarness />)

    const newWidths = { size: 120, date: 160, padding: 12 }

    act(() => {
      useSettingsStore.getState().updateLayout({ columnWidths: newWidths })
    })

    await waitFor(() => {
      const cw = useLayoutStore.getState().layout.columnWidths
      expect(cw.size).toBe(newWidths.size)
      expect(cw.date).toBe(newWidths.date)
      expect(cw.padding).toBe(newWidths.padding)
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
