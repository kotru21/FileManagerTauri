/// <reference types="vitest" />
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { FileEntry, FilePreview } from "@/shared/api/tauri"
import { tauriClient } from "@/shared/api/tauri/client"
import { PreviewPanel } from "../ui/PreviewPanel"

const file: FileEntry = {
  path: "/img.png",
  name: "img.png",
  is_dir: false,
  is_hidden: false,
  size: 10,
  modified: Date.now(),
  created: Date.now(),
  extension: "png",
}

const base64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABAQMAAAAl21bKAAAAA1BMVEX///+nxBvIAAAAAXRSTlMAQObYZgAAAApJREFUCNdjYAAAAAIAAeIhvDMAAAAASUVORK5CYII="

const preview = { type: "Image", mime: "image/png", base64 }

describe("ImageViewer basics", () => {
  it("renders and supports zoom-in", async () => {
    const spy = vi
      .spyOn(tauriClient, "getFilePreview")
      .mockResolvedValue(preview as unknown as FilePreview)

    render(<PreviewPanel file={file} />)

    const img = await screen.findByAltText("img.png")
    expect(img).toBeTruthy()

    const zoomIn = screen.getByTestId("zoom-in")
    fireEvent.click(zoomIn)

    await waitFor(() => {
      expect(img.style.transform).toContain("scale(1.25)")
    })

    spy.mockRestore()
  })

  it("close button calls onClose", async () => {
    const spy = vi
      .spyOn(tauriClient, "getFilePreview")
      .mockResolvedValue(preview as unknown as FilePreview)

    const onClose = vi.fn()
    render(<PreviewPanel file={file} onClose={onClose} />)

    const closeBtn = await screen.findByTestId("close")
    fireEvent.click(closeBtn)

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled()
    })

    spy.mockRestore()
  })
})
