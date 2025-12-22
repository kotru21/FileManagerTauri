import { beforeEach, describe, expect, it } from "vitest"
import { useSettingsStore } from "../store"

describe("importSettings", () => {
  beforeEach(() => {
    // reset to defaults
    useSettingsStore.getState().resetSettings()
  })

  it("ignores unknown fields when importing", () => {
    const payload = {
      appearance: { theme: "dark", unknownField: "shouldBeRemoved" },
    }

    const json = JSON.stringify(payload)
    const res = useSettingsStore.getState().importSettings(json)
    expect(res).toBe(true)

    const appearance = useSettingsStore.getState().settings.appearance
    expect(appearance.theme).toBe("dark")
    const appearanceRecord = appearance as unknown as Record<string, unknown>
    expect(appearanceRecord.unknownField).toBeUndefined()
  })

  it("rejects invalid enum values", () => {
    const payload = {
      appearance: { theme: "invalid-theme" },
    }
    const json = JSON.stringify(payload)
    const res = useSettingsStore.getState().importSettings(json)
    expect(res).toBe(false)
  })
})
