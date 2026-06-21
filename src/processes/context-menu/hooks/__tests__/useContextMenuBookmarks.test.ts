import { describe, expect, it, vi } from "vitest"
import { getBookmarkMenuState } from "../useContextMenuBookmarks"

vi.mock("@/features/bookmarks", () => ({
  useBookmarksStore: {
    getState: () => ({
      isBookmarked: (p: string) => p === "C:/marked",
      getBookmarkByPath: () => ({ id: "1", path: "C:/marked", name: "marked" }),
    }),
  },
}))

describe("getBookmarkMenuState", () => {
  it("returns bookmarked state for path", () => {
    expect(getBookmarkMenuState("C:/marked").isBookmarked).toBe(true)
  })
})
