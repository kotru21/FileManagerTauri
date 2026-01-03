import { act } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { useBookmarksStore } from "../store"

describe("useBookmarksStore", () => {
  beforeEach(() => {
    let n = 0
    vi.stubGlobal("crypto", {
      randomUUID: () => `uuid-${++n}`,
    } as unknown as Crypto)

    act(() => {
      useBookmarksStore.setState({ bookmarks: [] })
    })
  })

  it("addBookmark adds bookmark and derives name from path", () => {
    act(() => {
      useBookmarksStore.getState().addBookmark("C:\\Users\\me\\Docs\\")
    })

    const [b] = useBookmarksStore.getState().bookmarks
    expect(b.id).toBe("uuid-1")
    expect(b.name).toBe("Docs")
    expect(b.path).toBe("C:\\Users\\me\\Docs\\")
    expect(b.order).toBe(0)
  })

  it("addBookmark is no-op when already bookmarked", () => {
    act(() => {
      useBookmarksStore.getState().addBookmark("/a")
      useBookmarksStore.getState().addBookmark("/a")
    })

    expect(useBookmarksStore.getState().bookmarks).toHaveLength(1)
  })

  it("addBookmark accepts explicit name", () => {
    act(() => {
      useBookmarksStore.getState().addBookmark("/a", "My")
    })

    expect(useBookmarksStore.getState().bookmarks[0].name).toBe("My")
  })

  it("removeBookmark removes and recalculates order", () => {
    act(() => {
      useBookmarksStore.getState().addBookmark("/a")
      useBookmarksStore.getState().addBookmark("/b")
      useBookmarksStore.getState().removeBookmark("uuid-1")
    })

    const bookmarks = useBookmarksStore.getState().bookmarks
    expect(bookmarks.map((b) => b.path)).toEqual(["/b"])
    expect(bookmarks[0].order).toBe(0)
  })

  it("updateBookmark updates fields", () => {
    act(() => {
      useBookmarksStore.getState().addBookmark("/a")
      useBookmarksStore.getState().updateBookmark("uuid-1", { name: "New", color: "red" })
    })

    const b = useBookmarksStore.getState().bookmarks[0]
    expect(b.name).toBe("New")
    expect(b.color).toBe("red")
  })

  it("reorderBookmarks moves and recalculates order", () => {
    act(() => {
      useBookmarksStore.getState().addBookmark("/a")
      useBookmarksStore.getState().addBookmark("/b")
      useBookmarksStore.getState().addBookmark("/c")
      useBookmarksStore.getState().reorderBookmarks(2, 0)
    })

    const bookmarks = useBookmarksStore.getState().bookmarks
    expect(bookmarks.map((b) => b.path)).toEqual(["/c", "/a", "/b"])
    expect(bookmarks.map((b) => b.order)).toEqual([0, 1, 2])
  })

  it("isBookmarked and getBookmarkByPath work", () => {
    act(() => {
      useBookmarksStore.getState().addBookmark("/a")
    })

    expect(useBookmarksStore.getState().isBookmarked("/a")).toBe(true)
    expect(useBookmarksStore.getState().isBookmarked("/b")).toBe(false)

    const found = useBookmarksStore.getState().getBookmarkByPath("/a")
    expect(found?.id).toBe("uuid-1")
  })
})
