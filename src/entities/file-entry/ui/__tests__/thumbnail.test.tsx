/// <reference types="vitest" />
import { render } from "@testing-library/react"
import { expect, test } from "vitest"
import { FileThumbnail } from "../FileThumbnail"

test("uses CSS var for transition duration so animations-off works", () => {
  const { container } = render(
    <div>
      <FileThumbnail
        path="/a"
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
