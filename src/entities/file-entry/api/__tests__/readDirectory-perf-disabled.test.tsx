import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { tauriClient } from "@/shared/api/tauri/client"
import { useDirectoryContents } from "../queries"

function TestComponent({ path }: { path: string | null }) {
  const { data } = useDirectoryContents(path)
  return <div data-testid="count">{(data ?? []).length}</div>
}

describe("readDirectory perf disabled (integration)", () => {
  it("does not log perf when USE_PERF_LOGS=false", async () => {
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {})

    // disable perf via safe global accessor
    const proc = (
      globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }
    ).process
    const old = proc?.env?.USE_PERF_LOGS
    if (proc) {
      proc.env = proc.env ?? {}
      proc.env.USE_PERF_LOGS = "false"
    }

    const readSpy = vi.spyOn(tauriClient, "readDirectory").mockResolvedValue([])

    try {
      const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
      const { getByTestId } = render(
        <QueryClientProvider client={client}>
          <TestComponent path="/test" />
        </QueryClientProvider>,
      )

      await waitFor(() => expect(getByTestId("count")).toBeTruthy())

      expect(readSpy).toHaveBeenCalled()
      expect(debugSpy).not.toHaveBeenCalled()
    } finally {
      readSpy.mockRestore()
      if (proc?.env) {
        if (old === undefined) delete proc.env.USE_PERF_LOGS
        else proc.env.USE_PERF_LOGS = old
      }
      debugSpy.mockRestore()
    }
  })
})
