/// <reference types="vitest" />
import { render } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import { useLayoutStore } from "@/features/layout"
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

  it("updateColumnWidths updates runtime column widths", () => {
    render(<TestHarness />)

    const newWidths = { size: 130, date: 170, padding: 14 }
    useSettingsStore.getState().updateColumnWidths(newWidths)

    const cw = useLayoutStore.getState().layout.columnWidths
    expect(cw.size).toBe(newWidths.size)
    expect(cw.date).toBe(newWidths.date)
    expect(cw.padding).toBe(newWidths.padding)
  })
})
