import { describe, expect, it } from "vitest"

import { canShowThumbnail, getLocalImageUrl } from "../image-utils"

describe("shared/lib/image-utils", () => {
  describe("canShowThumbnail", () => {
    it("returns false for null/empty extension", () => {
      expect(canShowThumbnail(null)).toBe(false)
      expect(canShowThumbnail("" as unknown as string)).toBe(false)
    })

    it("is case-insensitive and supports common image extensions", () => {
      expect(canShowThumbnail("JPG")).toBe(true)
      expect(canShowThumbnail("png")).toBe(true)
      expect(canShowThumbnail("Svg")).toBe(true)
      expect(canShowThumbnail("txt")).toBe(false)
    })
  })

  describe("getLocalImageUrl", () => {
    it("produces file:/// URL and normalizes Windows slashes", () => {
      expect(getLocalImageUrl("C:\\Users\\me\\file.png")).toBe("file:///C:/Users/me/file.png")
    })
  })
})
