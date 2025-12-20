import { expect, test, vi, beforeEach } from "vitest"
import { commands } from "@/shared/api/tauri/bindings"
import { tauriClient } from "@/shared/api/tauri/client"

beforeEach(() => {
  vi.restoreAllMocks()
})

test("readDirectory returns data on ok result", async () => {
  const mockFiles = [{ path: "/tmp/file.txt", name: "file.txt", is_dir: false, is_hidden: false, extension: "txt", size: 100, modified: null, created: null }]
  vi.spyOn(commands, "readDirectory").mockResolvedValue({ status: "ok", data: mockFiles })

  const result = await tauriClient.readDirectory("/")
  expect(result).toEqual(mockFiles)
})

test("readDirectory throws on error result", async () => {
  vi.spyOn(commands, "readDirectory").mockResolvedValue({ status: "error", error: "permission denied" })

  await expect(tauriClient.readDirectory("/protected")).rejects.toThrow("permission denied")
})

test("renameEntry returns new path on ok result", async () => {
  vi.spyOn(commands, "renameEntry").mockResolvedValue({ status: "ok", data: "/tmp/newname.txt" })

  const newPath = await tauriClient.renameEntry("/tmp/file.txt", "newname.txt")
  expect(newPath).toBe("/tmp/newname.txt")
})

test("renameEntry throws when error", async () => {
  vi.spyOn(commands, "renameEntry").mockResolvedValue({ status: "error", error: "exists" })
  await expect(tauriClient.renameEntry("/tmp/file.txt", "file.txt")).rejects.toThrow("exists")
})