/// <reference types="vitest" />
import { beforeEach, describe, expect, it } from "vitest"
import type { FileEntry } from "@/shared/api/tauri"
import { getLastFiles, getPerfLog, setLastFiles, setPerfLog } from "../devLogger"

describe("devLogger", () => {
  beforeEach(() => {
    // ensure perf logs are enabled unless environment disables it
    ;(globalThis as unknown as { __fm_perfEnabled?: boolean }).__fm_perfEnabled = true
    ;(globalThis as unknown as { __fm_perfLog?: Record<string, unknown> }).__fm_perfLog = undefined
    ;(globalThis as unknown as { __fm_lastFiles?: unknown }).__fm_lastFiles = undefined
  })

  it("merges perf log entries", () => {
    setPerfLog({ a: 1 })
    setPerfLog({ b: 2 })
    expect(getPerfLog()).toMatchObject({ a: 1, b: 2 })
  })

  it("sets last files and getLastFiles returns them", () => {
    const files = [{ path: "/foo", name: "foo" }] as unknown as FileEntry[]
    setLastFiles(files)
    expect(getLastFiles()).toEqual(files)
  })
})
