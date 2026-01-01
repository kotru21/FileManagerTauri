/// <reference types="vitest" />
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { FileEntry, FilePreview } from "@/shared/api/tauri"
import { tauriClient } from "@/shared/api/tauri/client"
import { PreviewPanel } from "../ui/PreviewPanel"

const folder: FileEntry = {
  path: "/test/folder",
  name: "folder",
  is_dir: true,
  is_hidden: false,
  size: 0,
  modified: Date.now(),
  created: Date.now(),
  extension: null,
}

const fileEntry = (name: string, path: string): FileEntry => ({
  path,
  name,
  is_dir: false,
  is_hidden: false,
  size: 123,
  modified: Date.now(),
  created: Date.now(),
  extension: "txt",
})

const dirEntry = (name: string, path: string): FileEntry => ({
  path,
  name,
  is_dir: true,
  is_hidden: false,
  size: 0,
  modified: Date.now(),
  created: Date.now(),
  extension: null,
})

describe("FolderPreview interactions", () => {
  it("shows folder contents when clicked and allows drilling into subfolders", async () => {
    const readSpy = vi.spyOn(tauriClient, "readDirectory")
    readSpy.mockImplementation(async (path: string) => {
      if (path === "/test/folder")
        return [
          fileEntry("file1.txt", "/test/folder/file1.txt"),
          dirEntry("sub", "/test/folder/sub"),
        ]
      if (path === "/test/folder/sub") return [fileEntry("file2.txt", "/test/folder/sub/file2.txt")]
      return []
    })

    render(<PreviewPanel file={folder} />)

    // folder name is visible
    const names = screen.getAllByText("folder")
    expect(names.length).toBeGreaterThan(0)

    // wait for entries to load
    await waitFor(() => expect(readSpy).toHaveBeenCalledWith("/test/folder"))

    // file and subfolder should appear
    expect(await screen.findByText("file1.txt")).toBeTruthy()
    expect(await screen.findByText("sub")).toBeTruthy()

    // click subfolder to drill in
    fireEvent.click(screen.getByText("sub"))
    await waitFor(() => expect(readSpy).toHaveBeenCalledWith("/test/folder/sub"))

    expect(await screen.findByText("file2.txt")).toBeTruthy()
  })

  it("truncates long folder name in header and preserves full name in title", async () => {
    const longName = `${"a".repeat(120)}`
    const folderWithLongName: FileEntry = { ...folder, name: longName }
    const readSpy = vi.spyOn(tauriClient, "readDirectory").mockResolvedValue([])

    render(<PreviewPanel file={folderWithLongName} />)

    await waitFor(() => expect(readSpy).toHaveBeenCalledWith(folderWithLongName.path))

    const header = (await screen.findByRole("heading", { level: 4 })) as HTMLElement // h4
    // displayed text is truncated to MAX_DISPLAY_NAME chars + ellipsis in both folder header and main panel header
    const expectedDisplay = `${longName.slice(0, 24)}…`
    expect(header.textContent).toBe(expectedDisplay)
    expect(header.getAttribute("title")).toBe(longName)

    const mainHeader = (await screen.findByRole("heading", { level: 3 })) as HTMLElement // h3
    expect(mainHeader.textContent).toBe(expectedDisplay)
    expect(mainHeader.getAttribute("title")).toBe(longName)
  })

  it("truncates long file names in folder list and sets title + single-line classes", async () => {
    const longName = `${"b".repeat(120)}.txt`
    const longFile = fileEntry(longName, `/test/folder/${longName}`)
    const readSpy = vi.spyOn(tauriClient, "readDirectory").mockResolvedValue([longFile])

    render(<PreviewPanel file={folder} />)

    await waitFor(() => expect(readSpy).toHaveBeenCalledWith(folder.path))

    const span = await screen.findByText(longFile.name)
    expect(span).toBeTruthy()
    expect(span.getAttribute("title")).toBe(longName)
    expect(span.classList.contains("truncate")).toBeTruthy()
    expect(span.classList.contains("whitespace-nowrap")).toBeTruthy()

    const li = span.closest("li") as HTMLElement
    expect(li).toBeTruthy()
    expect(li.className.includes("min-w-0")).toBeTruthy()
  })

  it("shows image thumbnails for image files in a folder", async () => {
    const imageFile = fileEntry("img.png", "/test/folder/img.png")
    // ensure extension is png
    imageFile.extension = "png"

    const readSpy = vi.spyOn(tauriClient, "readDirectory").mockResolvedValue([imageFile])

    type Thumbnail = Awaited<ReturnType<typeof tauriClient.getThumbnail>>
    const thumb: Thumbnail = { type: "Thumbnail", base64: "c21hbGw=", mime: "image/png" }
    const thumbSpy = vi.spyOn(tauriClient, "getThumbnail").mockResolvedValue(thumb)

    render(<PreviewPanel file={folder} />)

    await waitFor(() => expect(readSpy).toHaveBeenCalledWith("/test/folder"))

    const fileBtn = await screen.findByText("img.png")
    // the file button contains the thumbnail img
    const parent = fileBtn.closest("button") || fileBtn.parentElement

    await waitFor(() => {
      const img = parent?.querySelector("img")
      expect(img).toBeTruthy()
      expect((img as HTMLImageElement).src).toContain("data:image/png;base64,c21hbGw=")
    })

    // open-file button exists on hover; invoke directly
    const openFileBtn = await screen.findByTestId("open-file")
    fireEvent.click(openFileBtn)
    const opener = await import("@tauri-apps/plugin-opener")
    expect(opener.openPath).toHaveBeenCalledWith("/test/folder/img.png")

    thumbSpy.mockRestore()
  })

  it("opens clicked file in the main preview", async () => {
    const txtFile = fileEntry("readme.txt", "/test/folder/readme.txt")
    txtFile.extension = "txt"

    const readSpy = vi.spyOn(tauriClient, "readDirectory").mockResolvedValue([txtFile])

    const preview: FilePreview = { type: "Text", content: "hello world", truncated: false }
    const pSpy = vi.spyOn(tauriClient, "getFilePreview").mockResolvedValue(preview)

    render(<PreviewPanel file={folder} />)

    await waitFor(() => expect(readSpy).toHaveBeenCalledWith("/test/folder"))

    // click the filename to open preview
    const btn = await screen.findByText("readme.txt")
    fireEvent.click(btn)

    // preview content should be displayed
    await waitFor(() => expect(screen.getByText("hello world")).toBeTruthy())

    pSpy.mockRestore()
  })
})
