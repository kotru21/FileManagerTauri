/// <reference types="vitest" />
import { fireEvent, render, waitFor } from "@testing-library/react"
import { expect, test, vi } from "vitest"
import type { FilePreview } from "@/shared/api/tauri"
import { tauriClient } from "@/shared/api/tauri/client"
import { FileThumbnail } from "../FileThumbnail"

test("uses CSS var for transition duration so animations-off works", () => {
  const { container } = render(
    <div>
      <FileThumbnail
        path="/a.png"
        extension="png"
        isDir={false}
        size={64}
        performanceSettings={{ lazyLoadImages: false, thumbnailCacheSize: 10 }}
      />
    </div>,
  )

  const img = container.querySelector("img")
  if (!img) {
    expect(true).toBe(true)
    return
  }

  expect(img.getAttribute("style")).toContain("var(--transition-duration)")
})

test("falls back to base64 preview when file:// image fails", async () => {
  const preview = { type: "Image", mime: "image/png", base64: "dGVzdA==" } as FilePreview
  const spy = vi.spyOn(tauriClient, "getFilePreview").mockResolvedValue(preview)

  const { container } = render(
    <div>
      <FileThumbnail
        path="/invalid.png"
        extension="png"
        isDir={false}
        size={64}
        performanceSettings={{ lazyLoadImages: false, thumbnailCacheSize: 10 }}
      />
    </div>,
  )

  const img = container.querySelector("img")!
  // simulate native image load error
  fireEvent.error(img)

  await waitFor(() => {
    expect(img.src).toContain("data:image/png;base64,dGVzdA==")
  })

  spy.mockRestore()
})
