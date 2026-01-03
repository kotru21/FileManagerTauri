/// <reference types="vitest" />
import { render } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import { useLayoutStore } from "@/entities/layout"
import { useSettingsStore } from "@/features/settings"
import { useSyncLayoutWithSettings } from "@/pages/file-browser/hooks/useSyncLayoutWithSettings"

function TestHarness() {
  useSyncLayoutWithSettings()
  return null
}

describe("Layout sync edge cases", () => {
  beforeEach(() => {
    useSettingsStore.getState().resetSettings()
    useLayoutStore.getState().resetLayout()
  })

  it("setColumnWidth updates column widths in layoutStore", () => {
    render(<TestHarness />)

    useLayoutStore.getState().setColumnWidth("size", 130)
    useLayoutStore.getState().setColumnWidth("date", 170)
    useLayoutStore.getState().setColumnWidth("padding", 14)

    const cw = useLayoutStore.getState().layout.columnWidths
    expect(cw.size).toBe(130)
    expect(cw.date).toBe(170)
    expect(cw.padding).toBe(14)
  })
})
