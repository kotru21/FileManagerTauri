import { describe, expect, it, vi } from "vitest"
import { useNavigationStore } from "@/features/navigation/model/store"

describe("perf integration", () => {
  it("does not emit perf logs when USE_PERF_LOGS=false", () => {
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {})

    // Manipulate a safe accessor to process.env used by isPerfEnabled
    const proc = (
      globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }
    ).process
    const old = proc?.env?.USE_PERF_LOGS
    if (proc) {
      proc.env = proc.env ?? {}
      proc.env.USE_PERF_LOGS = "false"
    }

    try {
      const { navigate } = useNavigationStore.getState()
      navigate("/perf-test")
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
