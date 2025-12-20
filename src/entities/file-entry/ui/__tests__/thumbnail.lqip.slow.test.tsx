/// <reference types="vitest" />
import { render, waitFor } from "@testing-library/react"
import { expect, test, vi } from "vitest"
import type { Thumbnail } from "@/shared/api/tauri"
import { tauriClient } from "@/shared/api/tauri/client"
import { FileThumbnail } from "../FileThumbnail"

test("shows LQIP quickly and replaces with delayed full thumbnail", async () => {
  const small = { base64: "c21hbGw=", mime: "image/png" }
  const full = { base64: "Zm9vYmFy", mime: "image/png" }

  // Mock getThumbnail so that the first call resolves immediately (LQIP)
  // and the second call resolves after a short delay to simulate slow generation
  const spy = vi.spyOn(tauriClient, "getThumbnail")
  spy.mockImplementationOnce(async () => small as Thumbnail)
  spy.mockImplementationOnce(async () => {
    // simulate delay
    await new Promise((res) => setTimeout(res, 50))
    return full as Thumbnail
  })

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

  // LQIP should appear quickly
  await waitFor(() => expect(img.src).toContain("data:image/png;base64,c21hbGw="), {
    timeout: 100,
  })

  // Then the delayed full thumbnail should replace it
  await waitFor(() => expect(img.src).toContain("data:image/png;base64,Zm9vYmFy"), {
    timeout: 500,
  })

  spy.mockRestore()
})
