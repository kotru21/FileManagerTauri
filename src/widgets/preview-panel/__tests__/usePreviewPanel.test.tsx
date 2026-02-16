import { render, waitFor } from "@testing-library/react"
import type { FileEntry, FilePreview } from "@/shared/api/tauri"
import { usePreviewPanel } from "../lib/usePreviewPanel"

vi.mock("@/shared/api/tauri/client", () => ({
  tauriClient: {
    getParentPath: vi.fn(),
    readDirectory: vi.fn(),
    getFilePreview: vi.fn(),
  },
  unwrapResult: vi.fn(),
}))

import { tauriClient } from "@/shared/api/tauri/client"

function makeFile(overrides: Partial<FileEntry> = {}): FileEntry {
  return {
    name: "test.txt",
    path: "C:\\Users\\test.txt",
    is_dir: false,
    is_hidden: false,
    size: 1024,
    modified: 1704067200,
    created: 1704067200,
    extension: "txt",
    ...overrides,
  } as FileEntry
}

function TestHarness({ file }: { file: FileEntry | null }) {
  const { preview, isLoading, error, fileEntry } = usePreviewPanel(file)
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="error">{error ?? "null"}</span>
      <span data-testid="preview">{preview ? preview.type : "null"}</span>
      <span data-testid="fileEntry">{fileEntry ? fileEntry.name : "null"}</span>
    </div>
  )
}

describe("usePreviewPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns null state when file is null", () => {
    const { getByTestId } = render(<TestHarness file={null} />)
    expect(getByTestId("fileEntry").textContent).toBe("null")
    expect(getByTestId("preview").textContent).toBe("null")
    expect(getByTestId("loading").textContent).toBe("false")
  })

  it("sets fileEntry when file has metadata", async () => {
    const file = makeFile({ name: "readme.md" })
    const { getByTestId } = render(<TestHarness file={file} />)
    await waitFor(() => {
      expect(getByTestId("fileEntry").textContent).toBe("readme.md")
    })
  })

  it("loads preview for non-directory files", async () => {
    const file = makeFile()
    vi.mocked(tauriClient.getFilePreview).mockResolvedValue({
      type: "Text",
      content: "hello world",
      truncated: false,
    })

    const { getByTestId } = render(<TestHarness file={file} />)

    await waitFor(() => {
      expect(getByTestId("preview").textContent).toBe("Text")
    })
    expect(tauriClient.getFilePreview).toHaveBeenCalledWith(file.path)
  })

  it("does not load preview for directories", async () => {
    const dir = makeFile({ is_dir: true, name: "mydir" })
    const { getByTestId } = render(<TestHarness file={dir} />)

    await waitFor(() => {
      expect(getByTestId("fileEntry").textContent).toBe("mydir")
    })
    expect(getByTestId("preview").textContent).toBe("null")
    expect(tauriClient.getFilePreview).not.toHaveBeenCalled()
  })

  it("sets error when preview loading fails", async () => {
    const file = makeFile()
    vi.mocked(tauriClient.getFilePreview).mockRejectedValue(new Error("Permission denied"))

    const { getByTestId } = render(<TestHarness file={file} />)

    await waitFor(() => {
      expect(getByTestId("error").textContent).toContain("Permission denied")
    })
  })

  it("shows loading state while preview resolves", async () => {
    const file = makeFile()
    let resolvePreview!: (v: FilePreview) => void
    vi.mocked(tauriClient.getFilePreview).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePreview = resolve
        }),
    )

    const { getByTestId } = render(<TestHarness file={file} />)

    await waitFor(() => {
      expect(getByTestId("loading").textContent).toBe("true")
    })

    resolvePreview({ type: "Text", content: "done", truncated: false })

    await waitFor(() => {
      expect(getByTestId("loading").textContent).toBe("false")
      expect(getByTestId("preview").textContent).toBe("Text")
    })
  })

  it("handles Image preview type", async () => {
    const file = makeFile({ extension: "png", name: "photo.png", path: "C:\\photo.png" })
    vi.mocked(tauriClient.getFilePreview).mockResolvedValue({
      type: "Image",
      base64: "abc123",
      mime: "image/png",
    })

    const { getByTestId } = render(<TestHarness file={file} />)

    await waitFor(() => {
      expect(getByTestId("preview").textContent).toBe("Image")
    })
  })

  it("handles Unsupported preview type", async () => {
    const file = makeFile({ extension: "bin", name: "data.bin", path: "C:\\data.bin" })
    vi.mocked(tauriClient.getFilePreview).mockResolvedValue({
      type: "Unsupported",
      mime: "application/octet-stream",
    })

    const { getByTestId } = render(<TestHarness file={file} />)

    await waitFor(() => {
      expect(getByTestId("preview").textContent).toBe("Unsupported")
    })
  })

  it("clears state when switching from file to null", async () => {
    const file = makeFile()
    vi.mocked(tauriClient.getFilePreview).mockResolvedValue({
      type: "Text",
      content: "hello",
      truncated: false,
    })

    const { getByTestId, rerender } = render(<TestHarness file={file} />)

    await waitFor(() => {
      expect(getByTestId("preview").textContent).toBe("Text")
    })

    rerender(<TestHarness file={null} />)

    await waitFor(() => {
      expect(getByTestId("fileEntry").textContent).toBe("null")
    })
  })

  it("resolves metadata when file properties are all null", async () => {
    const sparseFile = {
      name: null,
      path: "C:\\Users\\test.txt",
      is_dir: false,
      is_hidden: false,
      size: null,
      modified: null,
      created: null,
      extension: null,
    } as unknown as FileEntry

    const resolvedFile = makeFile({ path: "C:\\Users\\test.txt", name: "test.txt" })
    vi.mocked(tauriClient.getParentPath).mockResolvedValue("C:\\Users")
    vi.mocked(tauriClient.readDirectory).mockResolvedValue([resolvedFile])
    vi.mocked(tauriClient.getFilePreview).mockResolvedValue({
      type: "Text",
      content: "resolved",
      truncated: false,
    })

    const { getByTestId } = render(<TestHarness file={sparseFile} />)

    await waitFor(() => {
      expect(getByTestId("fileEntry").textContent).toBe("test.txt")
    })
    expect(tauriClient.getParentPath).toHaveBeenCalledWith("C:\\Users\\test.txt")
  })
})
