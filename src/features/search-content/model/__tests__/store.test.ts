import { act } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { SearchResult } from "@/shared/api/tauri"

import { useSearchStore } from "../store"

const sr = (path: string, name: string, is_dir: boolean): SearchResult => ({
  path,
  name,
  is_dir,
  matches: [],
})

describe("useSearchStore", () => {
  const reset = () => {
    act(() => {
      useSearchStore.setState({
        query: "",
        searchPath: "",
        searchContent: false,
        caseSensitive: false,
        isSearching: false,
        results: [],
        progress: null,
        shouldCancel: false,
      })
    })
  }

  it("has expected initial state", () => {
    reset()
    const s = useSearchStore.getState()
    expect(s.query).toBe("")
    expect(s.searchPath).toBe("")
    expect(s.searchContent).toBe(false)
    expect(s.caseSensitive).toBe(false)
    expect(s.isSearching).toBe(false)
    expect(s.results).toEqual([])
    expect(s.progress).toBeNull()
    expect(s.shouldCancel).toBe(false)
  })

  it("setters update fields", () => {
    reset()

    act(() => {
      useSearchStore.getState().setQuery("q")
      useSearchStore.getState().setSearchPath("/")
      useSearchStore.getState().setSearchContent(true)
      useSearchStore.getState().setCaseSensitive(true)
    })

    const s = useSearchStore.getState()
    expect(s.query).toBe("q")
    expect(s.searchPath).toBe("/")
    expect(s.searchContent).toBe(true)
    expect(s.caseSensitive).toBe(true)
  })

  it("setIsSearching(true) resets shouldCancel; setIsSearching(false) keeps shouldCancel", () => {
    reset()

    act(() => {
      useSearchStore.setState({ shouldCancel: true })
      useSearchStore.getState().setIsSearching(true)
    })

    expect(useSearchStore.getState().isSearching).toBe(true)
    expect(useSearchStore.getState().shouldCancel).toBe(false)

    act(() => {
      useSearchStore.setState({ shouldCancel: true })
      useSearchStore.getState().setIsSearching(false)
    })

    expect(useSearchStore.getState().isSearching).toBe(false)
    expect(useSearchStore.getState().shouldCancel).toBe(true)
  })

  it("appendResults appends to existing", () => {
    reset()

    act(() => {
      useSearchStore.getState().setResults([sr("/a", "a", false)])
      useSearchStore.getState().appendResults([sr("/b", "b", true)])
    })

    expect(useSearchStore.getState().results.map((r) => r.path)).toEqual(["/a", "/b"])
  })

  it("cancelSearch sets shouldCancel and stops searching", () => {
    reset()

    act(() => {
      useSearchStore.setState({ isSearching: true })
      useSearchStore.getState().cancelSearch()
    })

    expect(useSearchStore.getState().shouldCancel).toBe(true)
    expect(useSearchStore.getState().isSearching).toBe(false)
  })

  it("reset clears query/results/progress and cancels searching flags", () => {
    reset()

    act(() => {
      useSearchStore.setState({
        query: "q",
        results: [sr("/a", "a", false)],
        progress: { scanned: 1, found: 2, currentPath: "/" },
        isSearching: true,
        shouldCancel: true,
      })
      useSearchStore.getState().reset()
    })

    const s = useSearchStore.getState()
    expect(s.query).toBe("")
    expect(s.results).toEqual([])
    expect(s.progress).toBeNull()
    expect(s.isSearching).toBe(false)
    expect(s.shouldCancel).toBe(false)
  })
})
