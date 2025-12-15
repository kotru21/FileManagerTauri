import { describe, expect, it } from "vitest"
import { getBasename, getExtension, getFileType, joinPath } from "../file-utils"

describe("getFileType", () => {
  it("should return 'folder' for directories", () => {
    expect(getFileType(null, true)).toBe("folder")
    expect(getFileType("txt", true)).toBe("folder")
  })

  it("should return 'image' for image extensions", () => {
    expect(getFileType("jpg", false)).toBe("image")
    expect(getFileType("jpeg", false)).toBe("image")
    expect(getFileType("png", false)).toBe("image")
    expect(getFileType("gif", false)).toBe("image")
    expect(getFileType("webp", false)).toBe("image")
    expect(getFileType("svg", false)).toBe("image")
    expect(getFileType("bmp", false)).toBe("image")
  })

  it("should return 'video' for video extensions", () => {
    expect(getFileType("mp4", false)).toBe("video")
    expect(getFileType("mkv", false)).toBe("video")
    expect(getFileType("avi", false)).toBe("video")
    expect(getFileType("mov", false)).toBe("video")
    expect(getFileType("webm", false)).toBe("video")
  })

  it("should return 'audio' for audio extensions", () => {
    expect(getFileType("mp3", false)).toBe("audio")
    expect(getFileType("wav", false)).toBe("audio")
    expect(getFileType("flac", false)).toBe("audio")
    expect(getFileType("ogg", false)).toBe("audio")
  })

  it("should return 'document' for document extensions", () => {
    expect(getFileType("pdf", false)).toBe("document")
    expect(getFileType("doc", false)).toBe("document")
    expect(getFileType("docx", false)).toBe("document")
    expect(getFileType("xls", false)).toBe("document")
    expect(getFileType("xlsx", false)).toBe("document")
    expect(getFileType("ppt", false)).toBe("document")
    expect(getFileType("pptx", false)).toBe("document")
  })

  it("should return 'code' for code extensions", () => {
    expect(getFileType("js", false)).toBe("code")
    expect(getFileType("ts", false)).toBe("code")
    expect(getFileType("tsx", false)).toBe("code")
    expect(getFileType("jsx", false)).toBe("code")
    expect(getFileType("py", false)).toBe("code")
    expect(getFileType("rs", false)).toBe("code")
    expect(getFileType("go", false)).toBe("code")
  })

  it("should return 'text' for text extensions", () => {
    expect(getFileType("txt", false)).toBe("text")
    expect(getFileType("md", false)).toBe("text")
    expect(getFileType("json", false)).toBe("text")
    expect(getFileType("xml", false)).toBe("text")
    expect(getFileType("yaml", false)).toBe("text")
    expect(getFileType("yml", false)).toBe("text")
  })

  it("should return 'archive' for archive extensions", () => {
    expect(getFileType("zip", false)).toBe("archive")
    expect(getFileType("rar", false)).toBe("archive")
    expect(getFileType("7z", false)).toBe("archive")
    expect(getFileType("tar", false)).toBe("archive")
    expect(getFileType("gz", false)).toBe("archive")
  })

  it("should return 'executable' for executable extensions", () => {
    expect(getFileType("exe", false)).toBe("executable")
    expect(getFileType("msi", false)).toBe("executable")
    expect(getFileType("bat", false)).toBe("executable")
    expect(getFileType("sh", false)).toBe("executable")
  })

  it("should return 'unknown' for unknown extensions", () => {
    expect(getFileType("xyz", false)).toBe("unknown")
    expect(getFileType("abc123", false)).toBe("unknown")
    expect(getFileType(null, false)).toBe("unknown")
  })

  it("should be case insensitive", () => {
    expect(getFileType("JPG", false)).toBe("image")
    expect(getFileType("PDF", false)).toBe("document")
    expect(getFileType("MP3", false)).toBe("audio")
  })
})

describe("getExtension", () => {
  it("should extract extension from filename", () => {
    expect(getExtension("file.txt")).toBe("txt")
    expect(getExtension("document.pdf")).toBe("pdf")
    expect(getExtension("image.PNG")).toBe("png")
  })

  it("should handle multiple dots", () => {
    expect(getExtension("archive.tar.gz")).toBe("gz")
    expect(getExtension("file.test.spec.ts")).toBe("ts")
  })

  it("should return null for files without extension", () => {
    expect(getExtension("README")).toBeNull()
    expect(getExtension("Makefile")).toBeNull()
  })

  it("should handle hidden files", () => {
    expect(getExtension(".gitignore")).toBeNull()
    expect(getExtension(".env.local")).toBe("local")
  })

  it("should handle empty string", () => {
    expect(getExtension("")).toBeNull()
  })

  it("should handle files ending with dot", () => {
    expect(getExtension("file.")).toBeNull()
  })
})

describe("getBasename", () => {
  it("should extract basename from path", () => {
    expect(getBasename("/home/user/file.txt")).toBe("file.txt")
    expect(getBasename("C:\\Users\\file.txt")).toBe("file.txt")
  })

  it("should handle paths without directory", () => {
    expect(getBasename("file.txt")).toBe("file.txt")
  })

  it("should handle paths ending with separator", () => {
    expect(getBasename("/home/user/folder/")).toBe("folder")
    expect(getBasename("C:\\Users\\folder\\")).toBe("folder")
  })

  it("should handle root paths", () => {
    expect(getBasename("/")).toBe("")
    expect(getBasename("C:\\")).toBe("")
  })

  it("should handle empty string", () => {
    expect(getBasename("")).toBe("")
  })
})

describe("joinPath", () => {
  it("should join path parts with separator", () => {
    const result = joinPath("home", "user", "documents")
    expect(result).toMatch(/home[/\\]user[/\\]documents/)
  })

  it("should handle single part", () => {
    expect(joinPath("home")).toBe("home")
  })

  it("should handle empty parts", () => {
    const result = joinPath("home", "", "user")
    expect(result).toMatch(/home[/\\]user/)
  })

  it("should handle Windows paths", () => {
    const result = joinPath("C:", "Users", "Documents")
    expect(result).toContain("Users")
    expect(result).toContain("Documents")
  })

  it("should handle no arguments", () => {
    expect(joinPath()).toBe("")
  })
})