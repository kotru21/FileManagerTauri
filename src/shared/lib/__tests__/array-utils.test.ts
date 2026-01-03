import { describe, expect, it, vi } from "vitest"

import { findLastIndex, generateId } from "../array-utils"

describe("shared/lib/array-utils", () => {
  describe("findLastIndex", () => {
    it("returns last matching index", () => {
      const arr = [{ isDir: true }, { isDir: true }, { isDir: false }, { isDir: true }]

      const idx = findLastIndex(arr, (x) => x.isDir)
      expect(idx).toBe(3)
    })

    it("returns -1 when not found", () => {
      const idx = findLastIndex([1, 2, 3], (x) => x === 999)
      expect(idx).toBe(-1)
    })

    it("passes correct index and array to predicate", () => {
      const predicate = vi.fn((x: number, _i: number, _arr: number[]) => x % 2 === 0)
      const arr = [1, 2, 3, 4, 5]

      const idx = findLastIndex(arr, predicate)

      expect(idx).toBe(3)
      expect(predicate).toHaveBeenCalled()
      const [value, index, passedArr] = predicate.mock.calls.at(-1)!
      expect(value).toBe(4)
      expect(index).toBe(3)
      expect(passedArr).toBe(arr)
    })
  })

  describe("generateId", () => {
    it("uses crypto.randomUUID when available", () => {
      const randomUUID = vi.fn(() => "uuid-123")
      vi.stubGlobal("crypto", { randomUUID } as unknown as Crypto)

      expect(generateId()).toBe("uuid-123")
      expect(randomUUID).toHaveBeenCalledTimes(1)
    })

    it("falls back to timestamp+random when randomUUID is not available", () => {
      // Provide crypto without randomUUID
      vi.stubGlobal("crypto", {} as unknown as Crypto)

      const id = generateId()
      expect(typeof id).toBe("string")
      expect(id.length).toBeGreaterThan(5)
      expect(id).toContain("-")
    })
  })
})
