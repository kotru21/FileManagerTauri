import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { getBookmarkMenuState, useContextMenuBookmarks } from "../useContextMenuBookmarks"

const addBookmark = vi.fn()
const removeBookmark = vi.fn()

vi.mock("@/features/bookmarks", () => ({
  useBookmarksStore: Object.assign(
    (selector?: (s: unknown) => unknown) => {
      const state = {
        isBookmarked: (p: string) => p === "C:/marked",
        getBookmarkByPath: (p: string) =>
          p === "C:/marked" ? { id: "1", path: "C:/marked", name: "marked" } : undefined,
        addBookmark,
        removeBookmark,
      }
      return selector ? selector(state) : state
    },
    {
      getState: () => ({
        isBookmarked: (p: string) => p === "C:/marked",
        getBookmarkByPath: (p: string) =>
          p === "C:/marked" ? { id: "1", path: "C:/marked", name: "marked" } : undefined,
      }),
    },
  ),
}))

describe("getBookmarkMenuState", () => {
  it("returns bookmarked state for path", () => {
    expect(getBookmarkMenuState("C:/marked").isBookmarked).toBe(true)
  })
})

describe("useContextMenuBookmarks", () => {
  beforeEach(() => {
    addBookmark.mockClear()
    removeBookmark.mockClear()
  })

  it("adds bookmark when path is not bookmarked", () => {
    const { result } = renderHook(() => useContextMenuBookmarks())

    act(() => {
      result.current.toggleBookmark("C:/new")
    })

    expect(addBookmark).toHaveBeenCalledWith("C:/new")
    expect(removeBookmark).not.toHaveBeenCalled()
  })

  it("removes bookmark when path is already bookmarked", () => {
    const { result } = renderHook(() => useContextMenuBookmarks())

    act(() => {
      result.current.toggleBookmark("C:/marked")
    })

    expect(removeBookmark).toHaveBeenCalledWith("1")
    expect(addBookmark).not.toHaveBeenCalled()
  })
})
