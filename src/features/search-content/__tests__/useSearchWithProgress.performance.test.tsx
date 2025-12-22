import { render, waitFor } from "@testing-library/react"
import React from "react"
import { describe, expect, it, vi } from "vitest"
import { useSearchStore } from "@/features/search-content"
import { useSearchWithProgress } from "@/features/search-content/hooks/useSearchWithProgress"
import { useSettingsStore } from "@/features/settings"
import type { SearchResult } from "@/shared/api/tauri"
import { tauriClient } from "@/shared/api/tauri/client"

function TestComponent() {
  const { search } = useSearchWithProgress()
  React.useEffect(() => {
    // Trigger search on mount
    void search()
  }, [search])
  return null
}

describe("useSearchWithProgress - maxSearchResults propagation", () => {
  it("passes performance.maxSearchResults to tauriClient.searchFilesStream", async () => {
    // Arrange
    useSearchStore.getState().setQuery("query")
    useSearchStore.getState().setSearchPath("/")

    useSettingsStore.getState().updatePerformance({ maxSearchResults: 5 })

    const spy = vi.spyOn(tauriClient, "searchFilesStream").mockResolvedValue([] as SearchResult[])

    render(<TestComponent />)

    await waitFor(() => {
      expect(spy).toHaveBeenCalled()
      const calledWith = spy.mock.calls[0][0]
      expect(calledWith.max_results).toBe(5)
    })

    spy.mockRestore()
  })
})
