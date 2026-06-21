import { tauriClient, unwrapResult } from "../client"
import type { SearchOptions } from "../bindings"

const searchOptions = (
  overrides: Pick<SearchOptions, "search_path" | "query"> & Partial<SearchOptions>,
): SearchOptions => ({
  search_content: false,
  case_sensitive: false,
  max_results: null,
  file_extensions: null,
  ...overrides,
})

const ok = <T>(data: T) => ({ status: "ok" as const, data })

const mocks = vi.hoisted(() => ({
  readDirectory: vi.fn(),
  readDirectoryStream: vi.fn(),
  getDrives: vi.fn(),
  createDirectory: vi.fn(),
  createFile: vi.fn(),
  deleteEntries: vi.fn(),
  renameEntry: vi.fn(),
  copyEntries: vi.fn(),
  copyEntriesParallel: vi.fn(),
  moveEntries: vi.fn(),
  getFileContent: vi.fn(),
  getParentPath: vi.fn(),
  pathExists: vi.fn(),
  searchFiles: vi.fn(),
  searchFilesStream: vi.fn(),
  searchByName: vi.fn(),
  searchContent: vi.fn(),
  getFilePreview: vi.fn(),
  getThumbnail: vi.fn(),
  watchDirectory: vi.fn(),
  unwatchDirectory: vi.fn(),
  unwatchAll: vi.fn(),
}))

vi.mock("../bindings", () => ({ commands: mocks }))

describe("tauriClient coverage", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((m) => m.mockReset())
  })

  it("unwrapResult returns data on ok and throws on error", () => {
    expect(unwrapResult(ok([1]))).toEqual([1])
    expect(() => unwrapResult({ status: "error", error: "boom" })).toThrow("boom")
  })

  it("delegates all command wrappers", async () => {
    mocks.readDirectory.mockResolvedValue(ok([]))
    mocks.readDirectoryStream.mockResolvedValue(ok(null))
    mocks.getDrives.mockResolvedValue(ok([]))
    mocks.createDirectory.mockResolvedValue(ok(null))
    mocks.createFile.mockResolvedValue(ok(null))
    mocks.deleteEntries.mockResolvedValue(ok(null))
    mocks.renameEntry.mockResolvedValue(ok("/new"))
    mocks.copyEntries.mockResolvedValue(ok(null))
    mocks.copyEntriesParallel.mockResolvedValue(ok(null))
    mocks.moveEntries.mockResolvedValue(ok(null))
    mocks.getFileContent.mockResolvedValue(ok("text"))
    mocks.getParentPath.mockResolvedValue(ok("/parent"))
    mocks.pathExists.mockResolvedValue(ok(true))
    mocks.searchFiles.mockResolvedValue(ok([]))
    mocks.searchFilesStream.mockResolvedValue(ok([]))
    mocks.searchByName.mockResolvedValue(ok([]))
    mocks.searchContent.mockResolvedValue(ok([]))
    mocks.getFilePreview.mockResolvedValue(ok({ kind: "text", content: "x" }))
    mocks.getThumbnail.mockResolvedValue(ok({ data: "abc", mime: "image/png" }))
    mocks.watchDirectory.mockResolvedValue(ok(null))
    mocks.unwatchDirectory.mockResolvedValue(ok(null))
    mocks.unwatchAll.mockResolvedValue(ok(null))

    await expect(tauriClient.readDirectory("/")).resolves.toEqual([])
    await expect(tauriClient.readDirectoryStream("/", "req")).resolves.toBeNull()
    await expect(tauriClient.getDrives()).resolves.toEqual([])
    await expect(tauriClient.createDirectory("/d")).resolves.toBeNull()
    await expect(tauriClient.createFile("/f")).resolves.toBeNull()
    await expect(tauriClient.deleteEntries(["/f"])).resolves.toBeNull()
    await expect(tauriClient.renameEntry("/f", "g")).resolves.toBe("/new")
    await expect(tauriClient.copyEntries(["/a"], "/b")).resolves.toBeNull()
    await expect(tauriClient.copyEntriesParallel(["/a"], "/b")).resolves.toBeNull()
    await expect(tauriClient.moveEntries(["/a"], "/b")).resolves.toBeNull()
    await expect(tauriClient.getFileContent("/f")).resolves.toBe("text")
    await expect(tauriClient.getParentPath("/a/b")).resolves.toBe("/parent")
    await expect(tauriClient.pathExists("/a")).resolves.toBe(true)
    await expect(tauriClient.searchFiles(searchOptions({ search_path: "/", query: "q" }))).resolves.toEqual([])
    await expect(tauriClient.searchFilesStream(searchOptions({ search_path: "/", query: "q" }))).resolves.toEqual([])
    await expect(tauriClient.searchByName("/", "q", 10)).resolves.toEqual([])
    await expect(tauriClient.searchContent("/", "q", null, 10)).resolves.toEqual([])
    await expect(tauriClient.getFilePreview("/f")).resolves.toEqual({ kind: "text", content: "x" })
    await expect(tauriClient.getThumbnail("/f", 64)).resolves.toEqual({ data: "abc", mime: "image/png" })
    await expect(tauriClient.watchDirectory("/")).resolves.toBeNull()
    await expect(tauriClient.unwatchDirectory("/")).resolves.toBeNull()
    await expect(tauriClient.unwatchAll()).resolves.toBeNull()
  })
})
