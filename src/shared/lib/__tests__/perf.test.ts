import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

describe("perf", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
    delete (globalThis as { __fm_perfEnabled?: boolean }).__fm_perfEnabled
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("isPerfEnabled", () => {
    it("defaults to false when no env vars set", async () => {
      vi.stubEnv("VITE_USE_PERF_LOGS", "")
      vi.stubEnv("USE_PERF_LOGS", "")
      const { isPerfEnabled } = await import("../perf")
      expect(isPerfEnabled()).toBe(false)
    })

    it("returns false when VITE_USE_PERF_LOGS is false", async () => {
      vi.stubEnv("VITE_USE_PERF_LOGS", "false")
      const { isPerfEnabled } = await import("../perf")
      expect(isPerfEnabled()).toBe(false)
    })

    it("returns false when USE_PERF_LOGS is false", async () => {
      vi.stubEnv("VITE_USE_PERF_LOGS", "")
      vi.stubEnv("USE_PERF_LOGS", "false")
      const { isPerfEnabled } = await import("../perf")
      expect(isPerfEnabled()).toBe(false)
    })

    it("uses global __fm_perfEnabled when set", async () => {
      ;(globalThis as { __fm_perfEnabled?: boolean }).__fm_perfEnabled = true
      const { isPerfEnabled } = await import("../perf")
      expect(isPerfEnabled()).toBe(true)
    })
  })

  describe("withPerf", () => {
    it("runs fn directly when perf disabled", async () => {
      const { withPerf } = await import("../perf")
      const result = await withPerf("test", null, async () => "ok")
      expect(result).toBe("ok")
    })

    it("logs duration when perf enabled", async () => {
      ;(globalThis as { __fm_perfEnabled?: boolean }).__fm_perfEnabled = true
      const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {})
      const { withPerf } = await import("../perf")
      await withPerf("label", { x: 1 }, async () => 42)
      expect(debugSpy).toHaveBeenCalledWith(
        "[perf] label",
        expect.objectContaining({ x: 1, duration: expect.any(Number) }),
      )
    })

    it("logs error on rejection when perf enabled", async () => {
      ;(globalThis as { __fm_perfEnabled?: boolean }).__fm_perfEnabled = true
      const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {})
      const { withPerf } = await import("../perf")
      await expect(
        withPerf("label", null, async () => {
          throw new Error("fail")
        }),
      ).rejects.toThrow("fail")
      expect(debugSpy).toHaveBeenCalledWith(
        "[perf] label",
        expect.objectContaining({ duration: expect.any(Number), error: "Error: fail" }),
      )
    })
  })

  describe("withPerfSync", () => {
    it("runs fn directly when perf disabled", async () => {
      const { withPerfSync } = await import("../perf")
      expect(withPerfSync("test", null, () => "ok")).toBe("ok")
    })

    it("logs duration when perf enabled", async () => {
      ;(globalThis as { __fm_perfEnabled?: boolean }).__fm_perfEnabled = true
      const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {})
      const { withPerfSync } = await import("../perf")
      expect(withPerfSync("label", { y: 2 }, () => 7)).toBe(7)
      expect(debugSpy).toHaveBeenCalledWith(
        "[perf] label",
        expect.objectContaining({ y: 2, duration: expect.any(Number) }),
      )
    })

    it("logs error on throw when perf enabled", async () => {
      ;(globalThis as { __fm_perfEnabled?: boolean }).__fm_perfEnabled = true
      const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {})
      const { withPerfSync } = await import("../perf")
      expect(() =>
        withPerfSync("label", null, () => {
          throw new Error("sync-fail")
        }),
      ).toThrow("sync-fail")
      expect(debugSpy).toHaveBeenCalledWith(
        "[perf] label",
        expect.objectContaining({ duration: expect.any(Number), error: "Error: sync-fail" }),
      )
    })
  })

  describe("markPerf", () => {
    it("is a no-op when perf disabled", async () => {
      const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {})
      const { markPerf } = await import("../perf")
      markPerf("label", { z: 3 })
      expect(debugSpy).not.toHaveBeenCalled()
    })

    it("logs payload when perf enabled", async () => {
      ;(globalThis as { __fm_perfEnabled?: boolean }).__fm_perfEnabled = true
      const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {})
      const { markPerf } = await import("../perf")
      markPerf("label", { z: 3 })
      expect(debugSpy).toHaveBeenCalledWith("[perf] label", { z: 3 })
    })
  })
})
