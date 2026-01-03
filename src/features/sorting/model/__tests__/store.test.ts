import { act } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { useSortingStore } from "../store"

describe("useSortingStore", () => {
  const reset = () => {
    act(() => {
      useSortingStore.setState({
        sortConfig: { field: "name", direction: "asc" },
        folderSortConfigs: {},
      })
    })
  }

  it("starts with default sort config", () => {
    reset()
    const s = useSortingStore.getState()
    expect(s.sortConfig).toEqual({ field: "name", direction: "asc" })
  })

  it("setSortConfig replaces sortConfig", () => {
    reset()

    act(() => {
      useSortingStore.getState().setSortConfig({ field: "size", direction: "desc" })
    })

    expect(useSortingStore.getState().sortConfig).toEqual({ field: "size", direction: "desc" })
  })

  it("setSortField toggles direction when setting same field", () => {
    reset()

    act(() => {
      useSortingStore.getState().setSortField("name")
    })

    expect(useSortingStore.getState().sortConfig).toEqual({ field: "name", direction: "desc" })

    act(() => {
      useSortingStore.getState().setSortField("name")
    })

    expect(useSortingStore.getState().sortConfig).toEqual({ field: "name", direction: "asc" })
  })

  it("setSortField sets asc when switching field", () => {
    reset()

    act(() => {
      useSortingStore.getState().setSortConfig({ field: "name", direction: "desc" })
      useSortingStore.getState().setSortField("modified")
    })

    expect(useSortingStore.getState().sortConfig).toEqual({ field: "modified", direction: "asc" })
  })

  it("toggleSortDirection flips direction", () => {
    reset()

    act(() => {
      useSortingStore.getState().toggleSortDirection()
    })

    expect(useSortingStore.getState().sortConfig.direction).toBe("desc")
  })

  it("setFolderSortConfig stores per-folder config and getSortConfigForFolder returns override", () => {
    reset()

    act(() => {
      useSortingStore.getState().setSortConfig({ field: "name", direction: "asc" })
      useSortingStore.getState().setFolderSortConfig("/a", { field: "size", direction: "desc" })
    })

    expect(useSortingStore.getState().getSortConfigForFolder("/a")).toEqual({
      field: "size",
      direction: "desc",
    })

    expect(useSortingStore.getState().getSortConfigForFolder("/b")).toEqual({
      field: "name",
      direction: "asc",
    })
  })
})
