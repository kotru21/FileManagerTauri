import { describe, expect, it, vi } from "vitest"
import { markPerf, withPerf, withPerfSync } from "../perf"

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

  it("does not log when disabled via env", async () => {
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {})
    const proc = (
      globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }
    ).process
    const old = proc?.env?.USE_PERF_LOGS
    if (proc) {
      proc.env = proc.env ?? {}
      proc.env.USE_PERF_LOGS = "false"
    }
    try {
      const v = await withPerf("disabled", {}, async () => 1)
      expect(v).toBe(1)
      expect(debugSpy).not.toHaveBeenCalled()

      const s = withPerfSync("disabled-sync", {}, () => 2)
      expect(s).toBe(2)
      expect(debugSpy).not.toHaveBeenCalled()

      markPerf("noop", {})
      expect(debugSpy).not.toHaveBeenCalled()
    } finally {
      if (proc?.env) {
        if (old === undefined) delete proc.env.USE_PERF_LOGS
        else proc.env.USE_PERF_LOGS = old
      }
      debugSpy.mockRestore()
    }
  })
})
