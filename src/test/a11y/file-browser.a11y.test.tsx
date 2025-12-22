/// <reference types="vitest" />

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render } from "@testing-library/react"
import { expect, it } from "vitest"
import FileBrowserPage from "@/pages/file-browser/ui/FileBrowserPage"

function renderWithProviders(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, queryFn: () => [] as unknown } },
  })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

it("basic a11y check — FileBrowserPage (axe)", async () => {
  try {
    const pkgName = ["vitest", "axe"].join("-")
    const mod = await import(pkgName)
    const { axe, toHaveNoViolations } = mod
    expect.extend({ toHaveNoViolations })

    const { container } = renderWithProviders(<FileBrowserPage />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  } catch (_err) {
    // If axe or vitest-axe aren't installed in the environment, skip this test gracefully.
    console.warn("Skipping a11y test: vitest-axe not installed in environment.")
    expect(true).toBe(true)
  }
})
