/// <reference types="vitest" />

import { beforeEach, describe, expect, it, vi } from "vitest"
import { initLayoutSync } from "@/features/layout/sync"
import { useLayoutStore } from "@/features/layout"
import { useSettingsStore } from "@/features/settings"

describe("layout sync - debounceDelay change", () => {
  beforeEach(() => {
    useSettingsStore.getState().resetSettings()
    useLayoutStore.getState().resetLayout()
  })

  it("respects updated debounceDelay from settings", async () => {
    vi.useFakeTimers()
    const spy = vi.spyOn(useSettingsStore, "setState")

    const cleanup = initLayoutSync()

    // Change debounce delay to a small value
    useSettingsStore.getState().updatePerformance({ debounceDelay: 10 })

    // Make rapid layout updates
    useLayoutStore.getState().setColumnWidth("size", 120)
    useLayoutStore.getState().setColumnWidth("size", 130)

    // advance less than new debounce — should not flush yet
    vi.advanceTimersByTime(5)
    expect(spy).not.toHaveBeenCalled()

    // advance beyond new debounce delay
    vi.advanceTimersByTime(10)
    expect(spy).toHaveBeenCalled()

    spy.mockRestore()
    vi.useRealTimers()
    cleanup()
  })
})