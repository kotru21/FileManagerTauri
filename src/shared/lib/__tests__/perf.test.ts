import { describe, expect, it, vi } from "vitest"

describe("isPerfEnabled", () => {
  it("defaults to false when no env vars set", async () => {
    vi.stubEnv("VITE_USE_PERF_LOGS", "")
    vi.stubEnv("USE_PERF_LOGS", "")
    const { isPerfEnabled } = await import("../perf")
    expect(isPerfEnabled()).toBe(false)
  })
})
