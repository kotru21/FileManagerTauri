import { act } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { useRecentFoldersStore } from "../store"

describe("useRecentFoldersStore", () => {
  const reset = () => {
    act(() => {
      useRecentFoldersStore.setState({
        folders: [],
        maxFolders: 20,
      })
    })
  }

  it("adds folder to front with derived name and timestamp", () => {
    reset()

    vi.spyOn(Date, "now").mockReturnValue(123)

    act(() => {
      useRecentFoldersStore.getState().addFolder("C:\\Users\\me\\Docs\\")
    })

    const [first] = useRecentFoldersStore.getState().folders
    expect(first.path).toBe("C:\\Users\\me\\Docs\\")
    expect(first.name).toBe("Docs")
    expect(first.lastVisited).toBe(123)
  })

  it("deduplicates by path and moves existing to front", () => {
    reset()

    vi.spyOn(Date, "now").mockReturnValue(1)
    act(() => {
      useRecentFoldersStore.getState().addFolder("/a")
      useRecentFoldersStore.getState().addFolder("/b")
    })

    vi.spyOn(Date, "now").mockReturnValue(2)
    act(() => {
      useRecentFoldersStore.getState().addFolder("/a")
    })

    const folders = useRecentFoldersStore.getState().folders
    expect(folders.map((f) => f.path)).toEqual(["/a", "/b"])
    expect(folders[0].lastVisited).toBe(2)
  })

  it("respects maxFolders limit", () => {
    reset()

    act(() => {
      useRecentFoldersStore.setState({ maxFolders: 2 })
      useRecentFoldersStore.getState().addFolder("/a")
      useRecentFoldersStore.getState().addFolder("/b")
      useRecentFoldersStore.getState().addFolder("/c")
    })

    expect(useRecentFoldersStore.getState().folders.map((f) => f.path)).toEqual(["/c", "/b"])
  })

  it("removeFolder removes by path; clearAll clears list", () => {
    reset()

    act(() => {
      useRecentFoldersStore.getState().addFolder("/a")
      useRecentFoldersStore.getState().addFolder("/b")
      useRecentFoldersStore.getState().removeFolder("/a")
    })

    expect(useRecentFoldersStore.getState().folders.map((f) => f.path)).toEqual(["/b"])

    act(() => {
      useRecentFoldersStore.getState().clearAll()
    })

    expect(useRecentFoldersStore.getState().folders).toEqual([])
  })

  it("getRecent returns first N entries", () => {
    reset()

    act(() => {
      useRecentFoldersStore.getState().addFolder("/a")
      useRecentFoldersStore.getState().addFolder("/b")
      useRecentFoldersStore.getState().addFolder("/c")
    })

    expect(
      useRecentFoldersStore
        .getState()
        .getRecent(2)
        .map((f) => f.path),
    ).toEqual(["/c", "/b"])
  })
})
