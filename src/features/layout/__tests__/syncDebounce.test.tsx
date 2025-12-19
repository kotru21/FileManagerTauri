/// <reference types="vitest" />

import { render } from "@testing-library/react"
import { act } from "react-dom/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useSyncLayoutWithSettings } from "../../../pages/file-browser/hooks/useSyncLayoutWithSettings"
import { useSettingsStore } from "../../settings/model/store"
import { useLayoutStore } from "../model/layoutStore"

function Harness() {
  useSyncLayoutWithSettings()
  return null
}

describe("layout sync debounce", () => {
  beforeEach(() => {
    // reset stores
    useSettingsStore.getState().resetSettings()
    useLayoutStore.getState().resetLayout()
  })

  it("batches rapid layout updates into a single settings update", async () => {
    vi.useFakeTimers()
    const spy = vi.spyOn(useSettingsStore.getState(), "updateLayout")

    render(<Harness />)

    act(() => {
      useLayoutStore.getState().setColumnWidth("size", 120)
      useLayoutStore.getState().setColumnWidth("size", 130)
      useLayoutStore.getState().setColumnWidth("date", 160)
    })

    // advance less than debounce — should not flush yet
    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(spy).not.toHaveBeenCalled()

    // advance beyond debounce delay
    act(() => {
      vi.advanceTimersByTime(200)
    })

    expect(spy).toHaveBeenCalled()

    spy.mockRestore()
    vi.useRealTimers()
  })
})
