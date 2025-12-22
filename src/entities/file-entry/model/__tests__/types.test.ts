import { describe, expect, it } from "vitest"
import type { FileEntry } from "@/shared/api/tauri"
import { filterEntries, type SortConfig, sortEntries } from "../types"

// Helper to create test files
function createFileEntry(overrides: Partial<FileEntry> = {}): FileEntry {
  return {
    name: "test.txt",
    path: "/test/test.txt",
    is_dir: false,
    is_hidden: false,
    size: 1024,
    modified: 1700000000,
    created: 1700000000,
    extension: "txt",
    ...overrides,
  }
}

describe("sortEntries", () => {
  describe("sort by name", () => {
    it("should sort by name ascending", () => {
      const files = [
        createFileEntry({ name: "charlie.txt" }),
        createFileEntry({ name: "alpha.txt" }),
        createFileEntry({ name: "bravo.txt" }),
      ]

      const config: SortConfig = { field: "name", direction: "asc" }
      const result = sortEntries(files, config)

      expect(result[0].name).toBe("alpha.txt")
      expect(result[1].name).toBe("bravo.txt")
      expect(result[2].name).toBe("charlie.txt")
    })

    it("should sort by name descending", () => {
      const files = [
        createFileEntry({ name: "alpha.txt" }),
        createFileEntry({ name: "charlie.txt" }),
        createFileEntry({ name: "bravo.txt" }),
      ]

      const config: SortConfig = { field: "name", direction: "desc" }
      const result = sortEntries(files, config)

      expect(result[0].name).toBe("charlie.txt")
      expect(result[1].name).toBe("bravo.txt")
      expect(result[2].name).toBe("alpha.txt")
    })

    it("should be case insensitive", () => {
      const files = [
        createFileEntry({ name: "Beta.txt" }),
        createFileEntry({ name: "alpha.txt" }),
        createFileEntry({ name: "CHARLIE.txt" }),
      ]

      const config: SortConfig = { field: "name", direction: "asc" }
      const result = sortEntries(files, config)

      expect(result[0].name).toBe("alpha.txt")
      expect(result[1].name).toBe("Beta.txt")
      expect(result[2].name).toBe("CHARLIE.txt")
    })
  })

  describe("sort by size", () => {
    it("should sort by size ascending", () => {
      const files = [
        createFileEntry({ name: "large.txt", size: 3000 }),
        createFileEntry({ name: "small.txt", size: 1000 }),
        createFileEntry({ name: "medium.txt", size: 2000 }),
      ]

      const config: SortConfig = { field: "size", direction: "asc" }
      const result = sortEntries(files, config)

      expect(result[0].name).toBe("small.txt")
      expect(result[1].name).toBe("medium.txt")
      expect(result[2].name).toBe("large.txt")
    })

    it("should sort by size descending", () => {
      const files = [
        createFileEntry({ name: "small.txt", size: 1000 }),
        createFileEntry({ name: "large.txt", size: 3000 }),
        createFileEntry({ name: "medium.txt", size: 2000 }),
      ]

      const config: SortConfig = { field: "size", direction: "desc" }
      const result = sortEntries(files, config)

      expect(result[0].name).toBe("large.txt")
      expect(result[1].name).toBe("medium.txt")
      expect(result[2].name).toBe("small.txt")
    })
  })

  describe("sort by modified date", () => {
    it("should sort by modified date ascending", () => {
      const files = [
        createFileEntry({ name: "new.txt", modified: 3000 }),
        createFileEntry({ name: "old.txt", modified: 1000 }),
        createFileEntry({ name: "mid.txt", modified: 2000 }),
      ]

      const config: SortConfig = { field: "modified", direction: "asc" }
      const result = sortEntries(files, config)

      expect(result[0].name).toBe("old.txt")
      expect(result[1].name).toBe("mid.txt")
      expect(result[2].name).toBe("new.txt")
    })

    it("should sort by modified date descending", () => {
      const files = [
        createFileEntry({ name: "old.txt", modified: 1000 }),
        createFileEntry({ name: "new.txt", modified: 3000 }),
        createFileEntry({ name: "mid.txt", modified: 2000 }),
      ]

      const config: SortConfig = { field: "modified", direction: "desc" }
      const result = sortEntries(files, config)

      expect(result[0].name).toBe("new.txt")
      expect(result[1].name).toBe("mid.txt")
      expect(result[2].name).toBe("old.txt")
    })

    it("should handle null modified dates", () => {
      const files = [
        createFileEntry({ name: "dated.txt", modified: 1000 }),
        createFileEntry({ name: "nodated.txt", modified: null }),
      ]

      const config: SortConfig = { field: "modified", direction: "asc" }
      const result = sortEntries(files, config)

      expect(result).toHaveLength(2)
    })
  })

  describe("sort by type", () => {
    it("should sort by extension/type", () => {
      const files = [
        createFileEntry({ name: "doc.pdf", extension: "pdf" }),
        createFileEntry({ name: "image.jpg", extension: "jpg" }),
        createFileEntry({ name: "text.txt", extension: "txt" }),
      ]

      const config: SortConfig = { field: "type", direction: "asc" }
      const result = sortEntries(files, config)

      expect(result[0].extension).toBe("jpg")
      expect(result[1].extension).toBe("pdf")
      expect(result[2].extension).toBe("txt")
    })
  })

  describe("folders first", () => {
    it("should always put folders before files regardless of sort", () => {
      const files = [
        createFileEntry({ name: "zebra.txt", is_dir: false }),
        createFileEntry({ name: "folder", is_dir: true, extension: null }),
        createFileEntry({ name: "alpha.txt", is_dir: false }),
      ]

      const config: SortConfig = { field: "name", direction: "asc" }
      const result = sortEntries(files, config)

      expect(result[0].name).toBe("folder") // Folders first
      expect(result[1].name).toBe("alpha.txt")
      expect(result[2].name).toBe("zebra.txt")
    })
  })

  it("should not mutate original array", () => {
    const files = [createFileEntry({ name: "b.txt" }), createFileEntry({ name: "a.txt" })]
    const original = [...files]

    sortEntries(files, { field: "name", direction: "asc" })

    expect(files[0].name).toBe(original[0].name)
  })

  it("should handle empty array", () => {
    const result = sortEntries([], { field: "name", direction: "asc" })
    expect(result).toEqual([])
  })
})

describe("filterEntries", () => {
  // Fixed: explicitly set extension to null for files without extensions
  const files = [
    createFileEntry({ name: "visible.txt", is_hidden: false, extension: "txt" }),
    createFileEntry({ name: ".hidden", is_hidden: true, extension: null }),
    createFileEntry({ name: "document.pdf", is_hidden: false, extension: "pdf" }),
    createFileEntry({ name: ".secret", is_hidden: true, extension: null }),
    createFileEntry({ name: "image.png", is_hidden: false, extension: "png" }),
    createFileEntry({ name: "folder", is_dir: true, is_hidden: false, extension: null }),
  ]

  describe("showHidden filter", () => {
    it("should hide hidden files when showHidden is false", () => {
      const result = filterEntries(files, { showHidden: false })

      expect(result).toHaveLength(4)
      expect(result.every((f) => !f.is_hidden)).toBe(true)
    })

    it("should show all files when showHidden is true", () => {
      const result = filterEntries(files, { showHidden: true })

      expect(result).toHaveLength(6)
    })

    it("should hide hidden files by default", () => {
      const result = filterEntries(files, {})

      expect(result).toHaveLength(4)
      expect(result.every((f) => !f.is_hidden)).toBe(true)
    })
  })

  describe("extensions filter", () => {
    it("should filter by single extension", () => {
      const result = filterEntries(files, { showHidden: true, extensions: ["txt"] })

      expect(result.filter((f) => !f.is_dir)).toHaveLength(1)
      expect(result.some((f) => f.name === "visible.txt")).toBe(true)
      expect(result.some((f) => f.name === "folder")).toBe(true) // folder always included
    })

    it("should filter by multiple extensions", () => {
      const result = filterEntries(files, { showHidden: true, extensions: ["txt", "pdf"] })

      const nonDirs = result.filter((f) => !f.is_dir)
      expect(nonDirs).toHaveLength(2)
      expect(result.some((f) => f.name === "visible.txt")).toBe(true)
      expect(result.some((f) => f.name === "document.pdf")).toBe(true)
    })

    it("should always include folders regardless of extension filter", () => {
      const result = filterEntries(files, { showHidden: true, extensions: ["txt"] })

      expect(result.some((f) => f.name === "folder")).toBe(true)
    })

    it("should be case insensitive", () => {
      const result = filterEntries(files, { showHidden: true, extensions: ["TXT", "PNG"] })

      expect(result.some((f) => f.extension === "txt")).toBe(true)
      expect(result.some((f) => f.extension === "png")).toBe(true)
    })
  })

  describe("searchQuery filter", () => {
    it("should filter by name containing query", () => {
      const result = filterEntries(files, { showHidden: true, searchQuery: "visible" })

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe("visible.txt")
    })

    it("should be case insensitive", () => {
      const result = filterEntries(files, { showHidden: true, searchQuery: "VISIBLE" })

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe("visible.txt")
    })

    it("should match partial names", () => {
      const result = filterEntries(files, { showHidden: true, searchQuery: "doc" })

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe("document.pdf")
    })

    it("should return empty for non-matching query", () => {
      const result = filterEntries(files, { showHidden: true, searchQuery: "nonexistent" })

      expect(result).toHaveLength(0)
    })

    it("should return all when query is empty", () => {
      const result = filterEntries(files, { showHidden: true, searchQuery: "" })

      expect(result).toHaveLength(6)
    })
  })

  describe("combined filters", () => {
    it("should apply multiple filters together", () => {
      const result = filterEntries(files, {
        showHidden: false,
        extensions: ["txt", "pdf"],
        searchQuery: "vis",
      })

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe("visible.txt")
    })
  })

  it("should not mutate original array", () => {
    const original = [...files]
    filterEntries(files, { showHidden: false })
    expect(files).toEqual(original)
  })

  it("should handle empty array", () => {
    const result = filterEntries([], { showHidden: true })
    expect(result).toEqual([])
  })
})
