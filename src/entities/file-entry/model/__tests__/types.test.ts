import { describe, expect, it } from "vitest"
import type { FileEntry } from "@/shared/api/tauri"
import { filterEntries, sortEntries, type SortConfig } from "../types"

// Helper для создания тестовых файлов
function createFileEntry(overrides: Partial<FileEntry> = {}): FileEntry {
  return {
    name: "test.txt",
    path: "/test/test.txt",
    is_dir: false,
    is_hidden: false,
    size: 1024,
    modified: 1700000000,
    created: 1699000000,
    extension: "txt",
    ...overrides,
  }
}

describe("sortEntries", () => {
  const files: FileEntry[] = [
    createFileEntry({ name: "beta.txt", path: "/beta.txt", size: 200, modified: 1700000002 }),
    createFileEntry({ name: "alpha.txt", path: "/alpha.txt", size: 100, modified: 1700000001 }),
    createFileEntry({ name: "gamma.txt", path: "/gamma.txt", size: 300, modified: 1700000003 }),
    createFileEntry({ name: "folder", path: "/folder", is_dir: true, size: 0, extension: null }),
  ]

  describe("sort by name", () => {
    it("should sort by name ascending", () => {
      const config: SortConfig = { field: "name", direction: "asc" }
      const result = sortEntries(files, config)
      
      // Folders first
      expect(result[0].name).toBe("folder")
      // Then alphabetically
      expect(result[1].name).toBe("alpha.txt")
      expect(result[2].name).toBe("beta.txt")
      expect(result[3].name).toBe("gamma.txt")
    })

    it("should sort by name descending", () => {
      const config: SortConfig = { field: "name", direction: "desc" }
      const result = sortEntries(files, config)
      
      // Folders still first
      expect(result[0].name).toBe("folder")
      // Then reverse alphabetically
      expect(result[1].name).toBe("gamma.txt")
      expect(result[2].name).toBe("beta.txt")
      expect(result[3].name).toBe("alpha.txt")
    })

    it("should be case insensitive", () => {
      const mixedCase: FileEntry[] = [
        createFileEntry({ name: "Zebra.txt", path: "/Zebra.txt" }),
        createFileEntry({ name: "apple.txt", path: "/apple.txt" }),
        createFileEntry({ name: "Banana.txt", path: "/Banana.txt" }),
      ]
      const config: SortConfig = { field: "name", direction: "asc" }
      const result = sortEntries(mixedCase, config)
      
      expect(result[0].name).toBe("apple.txt")
      expect(result[1].name).toBe("Banana.txt")
      expect(result[2].name).toBe("Zebra.txt")
    })
  })

  describe("sort by size", () => {
    it("should sort by size ascending", () => {
      const config: SortConfig = { field: "size", direction: "asc" }
      const result = sortEntries(files, config)
      
      expect(result[0].name).toBe("folder") // Folders first
      expect(result[1].size).toBe(100)
      expect(result[2].size).toBe(200)
      expect(result[3].size).toBe(300)
    })

    it("should sort by size descending", () => {
      const config: SortConfig = { field: "size", direction: "desc" }
      const result = sortEntries(files, config)
      
      expect(result[0].name).toBe("folder") // Folders first
      expect(result[1].size).toBe(300)
      expect(result[2].size).toBe(200)
      expect(result[3].size).toBe(100)
    })
  })

  describe("sort by modified date", () => {
    it("should sort by modified date ascending", () => {
      const config: SortConfig = { field: "modified", direction: "asc" }
      const result = sortEntries(files, config)
      
      expect(result[0].name).toBe("folder")
      expect(result[1].modified).toBe(1700000001)
      expect(result[2].modified).toBe(1700000002)
      expect(result[3].modified).toBe(1700000003)
    })

    it("should sort by modified date descending", () => {
      const config: SortConfig = { field: "modified", direction: "desc" }
      const result = sortEntries(files, config)
      
      expect(result[0].name).toBe("folder")
      expect(result[1].modified).toBe(1700000003)
    })

    it("should handle null modified dates", () => {
      const withNullDates: FileEntry[] = [
        createFileEntry({ name: "a.txt", modified: null }),
        createFileEntry({ name: "b.txt", modified: 1700000001 }),
        createFileEntry({ name: "c.txt", modified: null }),
      ]
      const config: SortConfig = { field: "modified", direction: "asc" }
      const result = sortEntries(withNullDates, config)
      
      // Should not throw
      expect(result).toHaveLength(3)
    })
  })

  describe("sort by type", () => {
    it("should sort by extension/type", () => {
      const mixedTypes: FileEntry[] = [
        createFileEntry({ name: "doc.pdf", extension: "pdf" }),
        createFileEntry({ name: "image.jpg", extension: "jpg" }),
        createFileEntry({ name: "code.ts", extension: "ts" }),
        createFileEntry({ name: "folder", is_dir: true, extension: null }),
      ]
      const config: SortConfig = { field: "type", direction: "asc" }
      const result = sortEntries(mixedTypes, config)
      
      expect(result[0].name).toBe("folder") // Folders first
    })
  })

  describe("folders first invariant", () => {
    it("should always put folders before files regardless of sort", () => {
      const mixed: FileEntry[] = [
        createFileEntry({ name: "aaa.txt", is_dir: false }),
        createFileEntry({ name: "zzz", is_dir: true, extension: null }),
        createFileEntry({ name: "bbb.txt", is_dir: false }),
      ]

      const configs: SortConfig[] = [
        { field: "name", direction: "asc" },
        { field: "name", direction: "desc" },
        { field: "size", direction: "asc" },
        { field: "modified", direction: "desc" },
      ]

      for (const config of configs) {
        const result = sortEntries(mixed, config)
        expect(result[0].is_dir).toBe(true)
      }
    })
  })

  it("should not mutate original array", () => {
    const original = [...files]
    const config: SortConfig = { field: "name", direction: "asc" }
    sortEntries(files, config)
    
    expect(files).toEqual(original)
  })

  it("should handle empty array", () => {
    const config: SortConfig = { field: "name", direction: "asc" }
    const result = sortEntries([], config)
    
    expect(result).toEqual([])
  })
})

describe("filterEntries", () => {
  const files: FileEntry[] = [
    createFileEntry({ name: "document.txt", is_hidden: false }),
    createFileEntry({ name: ".hidden", is_hidden: true, extension: null }),
    createFileEntry({ name: "image.png", is_hidden: false, extension: "png" }),
    createFileEntry({ name: "script.js", is_hidden: false, extension: "js" }),
    createFileEntry({ name: ".secret.txt", is_hidden: true }),
    createFileEntry({ name: "folder", is_dir: true, is_hidden: false, extension: null }),
  ]

  describe("showHidden filter", () => {
    it("should hide hidden files when showHidden is false", () => {
      const result = filterEntries(files, { showHidden: false })
      
      expect(result.every((f) => !f.is_hidden)).toBe(true)
      expect(result).toHaveLength(4)
    })

    it("should show all files when showHidden is true", () => {
      const result = filterEntries(files, { showHidden: true })
      
      expect(result).toHaveLength(6)
    })

    it("should show all files by default", () => {
      const result = filterEntries(files, {})
      
      expect(result).toHaveLength(6)
    })
  })

  describe("extensions filter", () => {
    it("should filter by single extension", () => {
      const result = filterEntries(files, { extensions: ["txt"] })
      
      expect(result.every((f) => f.extension === "txt" || f.is_dir)).toBe(true)
    })

    it("should filter by multiple extensions", () => {
      const result = filterEntries(files, { extensions: ["txt", "png"] })
      
      const extensions = result.filter((f) => !f.is_dir).map((f) => f.extension)
      expect(extensions.every((e) => e === "txt" || e === "png")).toBe(true)
    })

    it("should always include folders regardless of extension filter", () => {
      const result = filterEntries(files, { extensions: ["txt"] })
      
      expect(result.some((f) => f.is_dir)).toBe(true)
    })

    it("should be case insensitive", () => {
      const result = filterEntries(files, { extensions: ["TXT", "PNG"] })
      
      expect(result.some((f) => f.extension === "txt")).toBe(true)
      expect(result.some((f) => f.extension === "png")).toBe(true)
    })
  })

  describe("searchQuery filter", () => {
    it("should filter by name containing query", () => {
      const result = filterEntries(files, { searchQuery: "doc" })
      
      expect(result.some((f) => f.name === "document.txt")).toBe(true)
    })

    it("should be case insensitive", () => {
      const result = filterEntries(files, { searchQuery: "DOC" })
      
      expect(result.some((f) => f.name === "document.txt")).toBe(true)
    })

    it("should match partial names", () => {
      const result = filterEntries(files, { searchQuery: "image" })
      
      expect(result.some((f) => f.name === "image.png")).toBe(true)
    })

    it("should return empty for non-matching query", () => {
      const result = filterEntries(files, { searchQuery: "xyz123" })
      
      expect(result).toHaveLength(0)
    })

    it("should handle empty query", () => {
      const result = filterEntries(files, { searchQuery: "" })
      
      expect(result).toHaveLength(6)
    })
  })

  describe("combined filters", () => {
    it("should apply multiple filters together", () => {
      const result = filterEntries(files, {
        showHidden: false,
        extensions: ["txt"],
        searchQuery: "doc",
      })
      
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe("document.txt")
    })
  })

  it("should not mutate original array", () => {
    const original = [...files]
    filterEntries(files, { showHidden: false })
    
    expect(files).toEqual(original)
  })

  it("should handle empty array", () => {
    const result = filterEntries([], { showHidden: false })
    
    expect(result).toEqual([])
  })
})