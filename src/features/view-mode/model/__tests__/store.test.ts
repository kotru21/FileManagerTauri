import { act } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { useViewModeStore } from "../store"

describe("useViewModeStore", () => {
  const reset = () => {
    act(() => {
      useViewModeStore.setState({
        settings: {
          mode: "list",
          gridSize: "medium",
          folderSettings: {},
        },
      })
    })
  }

  it("setViewMode updates global mode", () => {
    reset()

    act(() => {
      useViewModeStore.getState().setViewMode("grid")
    })

    expect(useViewModeStore.getState().settings.mode).toBe("grid")
  })

  it("setGridSize updates grid size", () => {
    reset()

    act(() => {
      useViewModeStore.getState().setGridSize("large")
    })

    expect(useViewModeStore.getState().settings.gridSize).toBe("large")
  })

  it("setFolderViewMode stores per-folder mode and getViewModeForFolder prefers override", () => {
    reset()

    act(() => {
      useViewModeStore.getState().setViewMode("list")
      useViewModeStore.getState().setFolderViewMode("/a", "details")
    })

    expect(useViewModeStore.getState().getViewModeForFolder("/a")).toBe("details")
    expect(useViewModeStore.getState().getViewModeForFolder("/b")).toBe("list")
  })

  it("setFolderViewMode preserves other folder settings fields", () => {
    reset()

    act(() => {
      useViewModeStore.setState({
        settings: {
          mode: "list",
          gridSize: "medium",
          folderSettings: {
            "/a": { sortField: "name", sortDirection: "asc" },
          },
        },
      })
      useViewModeStore.getState().setFolderViewMode("/a", "grid")
    })

    expect(useViewModeStore.getState().settings.folderSettings["/a"]).toEqual({
      sortField: "name",
      sortDirection: "asc",
      mode: "grid",
    })
  })
})
