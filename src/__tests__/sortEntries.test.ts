import { describe, expect, it } from "vitest"
import type { FileEntry } from "@/entities/file-entry"
import { filterEntries, sortEntries } from "@/entities/file-entry/model/types"

describe("sortEntries - name using name_lower", () => {
  it("should sort case-insensitive using name_lower", () => {
    const a: FileEntry = {
      path: "1",
      name: "Abc",
      name_lower: "abc",
      is_dir: false,
      size: 0,
      modified: null,
      extension: null,
    }
    const b: FileEntry = {
      path: "2",
      name: "aaa",
      name_lower: "aaa",
      is_dir: false,
      size: 0,
      modified: null,
      extension: null,
    }
    const entries = sortEntries([a, b], { field: "name", direction: "asc" })
    expect(entries[0].name_lower).toBe("aaa")
  })
})

describe("filterEntries - uses name_lower for case-insensitive filtering", () => {
  it("should filter using name_lower", () => {
    const entries: FileEntry[] = [
      {
        path: "1",
        name: "Abc",
        name_lower: "abc",
        is_dir: false,
        size: 0,
        modified: null,
        extension: null,
      },
      {
        path: "2",
        name: "Other",
        name_lower: "other",
        is_dir: false,
        size: 0,
        modified: null,
        extension: null,
      },
    ]
    const res = filterEntries(entries, { searchQuery: "abc" })
    expect(res.length).toBe(1)
    expect(res[0].name_lower).toBe("abc")
  })
})
