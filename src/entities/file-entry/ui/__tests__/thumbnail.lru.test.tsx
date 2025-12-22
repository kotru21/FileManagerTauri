import { describe, expect, it } from "vitest"
import { __maybeCacheThumbnail, __thumbnailCache } from "../FileThumbnail"

describe("thumbnail cache LRU behaviour", () => {
  it("keeps newest entries and prunes oldest when exceeding max size", () => {
    // Clear cache initially
    __thumbnailCache.clear()

    // Add N entries
    __maybeCacheThumbnail("/a", "url-a", 3)
    __maybeCacheThumbnail("/b", "url-b", 3)
    __maybeCacheThumbnail("/c", "url-c", 3)

    expect(__thumbnailCache.size).toBe(3)
    expect(Array.from(__thumbnailCache.keys())).toEqual(["/a", "/b", "/c"]) // insertion order

    // Adding a new entry should prune the oldest (/a)
    __maybeCacheThumbnail("/d", "url-d", 3)

    expect(__thumbnailCache.size).toBe(3)
    expect(__thumbnailCache.has("/a")).toBe(false)
    expect(__thumbnailCache.has("/b")).toBe(true)
    expect(__thumbnailCache.has("/c")).toBe(true)
    expect(__thumbnailCache.has("/d")).toBe(true)

    // Touch /b to make it newest
    __maybeCacheThumbnail("/b", "url-b-v2", 3)
    // Add another entry to cause prune
    __maybeCacheThumbnail("/e", "url-e", 3)

    // Now the oldest should be /c
    expect(__thumbnailCache.has("/c")).toBe(false)
    expect(__thumbnailCache.has("/b")).toBe(true)
    expect(__thumbnailCache.has("/d")).toBe(true)
    expect(__thumbnailCache.has("/e")).toBe(true)
  })
})
