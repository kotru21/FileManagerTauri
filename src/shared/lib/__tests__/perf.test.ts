import { describe, expect, it, vi } from "vitest"
import { withPerf } from "../perf"

describe("withPerf", () => {
  it("logs duration and returns value on success", async () => {
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {})
    const result = await withPerf("test", { a: 1 }, async () => {
      await new Promise((r) => setTimeout(r, 10))
      return 42
    })
    expect(result).toBe(42)
    expect(debugSpy).toHaveBeenCalled()
    debugSpy.mockRestore()
  })

  it("logs duration and error on failure", async () => {
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {})
    await expect(
      withPerf("test-err", null, async () => {
        await new Promise((r) => setTimeout(r, 5))
        throw new Error("boom")
      }),
    ).rejects.toThrow("boom")
    expect(debugSpy).toHaveBeenCalled()
    debugSpy.mockRestore()
  })
})
