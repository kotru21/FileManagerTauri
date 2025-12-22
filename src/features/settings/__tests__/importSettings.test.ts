// @ts-nocheck
/// <reference types="vitest" />
import { useSettingsStore } from "../model/store"

describe("importSettings", () => {
  beforeEach(() => {
    // reset to defaults
    useSettingsStore.setState({ settings: useSettingsStore.getState().settings })
  })

  it("imports partial settings and merges defaults", () => {
    const partial = JSON.stringify({ appearance: { theme: "light" } })
    const ok = useSettingsStore.getState().importSettings(partial)
    expect(ok).toBe(true)
    const s = useSettingsStore.getState().settings
    expect(s.appearance.theme).toBe("light")
    // other fields preserved from defaults
    expect(s.appearance.fontSize).toBeDefined()
  })

  it("rejects invalid types", () => {
    const invalid = JSON.stringify({ appearance: { fontSize: 123 } })
    const ok = useSettingsStore.getState().importSettings(invalid)
    expect(ok).toBe(false)
  })

  it("handles version mismatch but still imports and sets canonical version", () => {
    const old = JSON.stringify({ version: 0, appearance: { theme: "light" } })
    const ok = useSettingsStore.getState().importSettings(old)
    expect(ok).toBe(true)
    const s = useSettingsStore.getState().settings
    expect(s.version).toBe(1) // canonicalized
    expect(s.appearance.theme).toBe("light")
  })
})
