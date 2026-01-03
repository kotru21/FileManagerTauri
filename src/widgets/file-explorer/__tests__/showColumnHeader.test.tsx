/// <reference types="vitest" />

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, waitFor } from "@testing-library/react"
import { act } from "react"
import { beforeEach, describe, expect, it } from "vitest"
import { ColumnHeader } from "@/entities/file-entry"
import { useLayoutStore } from "@/entities/layout"
import { useNavigationStore } from "@/features/navigation"
import { useSettingsStore } from "@/features/settings"

function renderWithProviders(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, queryFn: () => [] as unknown } },
  })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

describe("Column header toggle", () => {
  beforeEach(() => {
    useSettingsStore.getState().resetSettings()
    // ensure the test navigation path is set
    useNavigationStore.getState().navigate("/")
  })

  it("shows ColumnHeader in simple list when setting enabled", async () => {
    // Enable the toggle
    act(() => useSettingsStore.getState().updateLayout({ showColumnHeadersInSimpleList: true }))

    function TestHeaderHarness() {
      const layout = useLayoutStore((s) => s.layout)
      const show = useSettingsStore.getState().settings.layout.showColumnHeadersInSimpleList
      return show ? (
        <ColumnHeader
          columnWidths={layout.columnWidths}
          onColumnResize={() => {}}
          sortConfig={{ field: "name", direction: "asc" }}
          onSort={() => {}}
        />
      ) : (
        <div>NoHeader</div>
      )
    }

    const { getByText, container } = renderWithProviders(<TestHeaderHarness />)

    // Expect ColumnHeader to show the label "Имя"
    await waitFor(() => {
      expect(getByText(/Имя/)).toBeTruthy()
    })

    container.remove()
  })
})
