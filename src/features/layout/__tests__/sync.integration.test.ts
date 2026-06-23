import { act } from "@testing-library/react"
import { getPresetLayout, useSettingsStore } from "@/entities/app-settings"
import { useLayoutStore } from "@/entities/layout"
import { initLayoutSync, isApplyingSettings, stopLayoutSync } from "../sync"

describe("initLayoutSync", () => {
  beforeEach(async () => {
    stopLayoutSync()
    localStorage.removeItem("layout-storage")
    localStorage.removeItem("app-settings")
    await useLayoutStore.persist?.clearStorage?.()
    await useSettingsStore.persist?.clearStorage?.()
    act(() => {
      useLayoutStore.getState().resetLayout()
      useSettingsStore.getState().resetSettings()
    })
  })

  it("applies preset panel layout when settings preset changes", async () => {
    const teardown = initLayoutSync()
    const before = useLayoutStore.getState().layout.mainPanelSize

    act(() => {
      useSettingsStore.getState().setLayoutPreset("compact")
    })

    await new Promise((r) => setTimeout(r, 50))

    const after = useLayoutStore.getState().layout.mainPanelSize
    expect(after).not.toBe(before)
    expect(after).toBe(getPresetLayout("compact").mainPanelSize)
    teardown()
  })

  it("isApplyingSettings prevents feedback loop flag", () => {
    initLayoutSync()
    expect(isApplyingSettings()).toBe(false)

    act(() => {
      useSettingsStore.getState().setLayoutPreset("wide")
    })

    expect(isApplyingSettings()).toBe(false)
    stopLayoutSync()
  })

  it("ignores preset updates when preset value is unchanged", () => {
    const teardown = initLayoutSync()
    const before = useLayoutStore.getState().layout.mainPanelSize
    const currentPreset = useSettingsStore.getState().settings.layout.currentPreset

    act(() => {
      useSettingsStore.getState().setLayoutPreset(currentPreset)
    })

    expect(useLayoutStore.getState().layout.mainPanelSize).toBe(before)
    teardown()
  })
})
