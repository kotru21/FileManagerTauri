import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import type { SearchOptions } from "@/shared/api/tauri"
import { tauriClient } from "@/shared/api/tauri/client"

const searchOptions = (
  overrides: Pick<SearchOptions, "search_path" | "query"> & Partial<SearchOptions>,
): SearchOptions => ({
  search_content: false,
  case_sensitive: false,
  max_results: null,
  file_extensions: null,
  ...overrides,
})
import { searchKeys, useSearch, useSearchByName, useSearchContent } from "../queries"

vi.mock("@/shared/api/tauri/client", () => ({
  tauriClient: {
    searchByName: vi.fn(async () => []),
    searchContent: vi.fn(async () => []),
    searchFiles: vi.fn(async () => []),
  },
}))

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe("search queries coverage", () => {
  it("exposes stable query keys", () => {
    expect(searchKeys.byName("/", "ab")).toEqual(["search", "name", "/", "ab"])
    expect(searchKeys.byContent("/", "ab")).toEqual(["search", "content", "/", "ab"])
    expect(searchKeys.full(searchOptions({ search_path: "/", query: "ab" }))).toEqual([
      "search",
      "full",
      searchOptions({ search_path: "/", query: "ab" }),
    ])
  })

  it("runs search hooks when enabled", async () => {
    renderHook(() => useSearchByName("/", "abc"), { wrapper })
    renderHook(() => useSearchContent("/", "abc", ["txt"], 5), { wrapper })
    renderHook(
      () => useSearch(searchOptions({ search_path: "/", query: "abc" }), true),
      { wrapper },
    )

    await waitFor(() => {
      expect(tauriClient.searchByName).toHaveBeenCalled()
      expect(tauriClient.searchContent).toHaveBeenCalled()
      expect(tauriClient.searchFiles).toHaveBeenCalled()
    })
  })
})
