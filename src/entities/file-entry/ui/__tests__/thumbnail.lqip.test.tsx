/// <reference types="vitest" />
import { render, waitFor } from "@testing-library/react"
import { expect, test, vi } from "vitest"
import type { Thumbnail } from "@/shared/api/tauri"
import { tauriClient } from "@/shared/api/tauri/client"
import { FileThumbnail } from "../FileThumbnail"

test("shows LQIP then replaces with full thumbnail", async () => {
  const small = { base64: "c21hbGw=", mime: "image/png" }
  const full = { base64: "Zm9vYmFy", mime: "image/png" }

  const spy = vi.spyOn(tauriClient, "getThumbnail")
  spy.mockResolvedValueOnce(small as Thumbnail).mockResolvedValueOnce(full as Thumbnail)

  const { container } = render(
    <div>
      <FileThumbnail
        path="/img.png"
        extension="png"
        isDir={false}
        size={64}
        performanceSettings={{ lazyLoadImages: false, thumbnailCacheSize: 10 }}
        thumbnailGenerator={{ maxSide: 128 }}
      />
    </div>,
  )

  const img = container.querySelector("img")!
  // initially LQIP should be set
  await waitFor(() => expect(img.src).toContain("data:image/png;base64,c21hbGw="))

  // then full should replace it
  await waitFor(() => expect(img.src).toContain("data:image/png;base64,Zm9vYmFy"))

  spy.mockRestore()
})

test("does not call backend thumbnail generator for svg", async () => {
  const spy = vi.spyOn(tauriClient, "getThumbnail")

  const { container } = render(
    <div>
      <FileThumbnail
        path="/img.svg"
        extension="svg"
        isDir={false}
        size={64}
        performanceSettings={{ lazyLoadImages: false, thumbnailCacheSize: 10 }}
        thumbnailGenerator={{ maxSide: 128 }}
      />
    </div>,
  )

  // ensure loading started (img exists)
  await waitFor(() => expect(container.querySelector("img")).toBeTruthy())

  expect(spy).not.toHaveBeenCalled()
  spy.mockRestore()
})
