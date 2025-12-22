import { render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { VirtualFileList } from "@/widgets/file-explorer"

describe("virtualizer perf disabled (integration)", () => {
  it("does not log perf when USE_PERF_LOGS=false", async () => {
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
      render(
        <VirtualFileList
          files={[]}
          selectedPaths={new Set()}
          onSelect={() => {}}
          onOpen={() => {}}
        />,
      )

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
