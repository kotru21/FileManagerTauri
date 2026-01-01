import { describe, expect, it } from "vitest"
import { normalizePathForComparison } from "../normalizePath"

describe("normalizePathForComparison", () => {
  it("normalizes backslashes and trims trailing slash", () => {
    expect(normalizePathForComparison("C:\\Foo\\Bar\\")).toBe("c:/foo/bar")
  })

  it("keeps Windows drive root trailing slash", () => {
    expect(normalizePathForComparison("C:\\\\")).toBe("c:/")
    expect(normalizePathForComparison("c:/")).toBe("c:/")
  })

  it("normalizes extended-length paths (\\\\?\\ prefix)", () => {
    expect(normalizePathForComparison("\\\\?\\C:\\Foo\\Bar")).toBe("c:/foo/bar")
  })

  it("normalizes UNC extended-length paths", () => {
    expect(normalizePathForComparison("\\\\?\\UNC\\Server\\Share\\Dir")).toBe("//server/share/dir")
  })

  it("does not lowercase typical POSIX paths", () => {
    expect(normalizePathForComparison("/Home/User/Docs/")).toBe("/Home/User/Docs")
  })
})
