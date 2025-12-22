/// <reference types="vitest" />
import { render, waitFor } from "@testing-library/react"
import { act } from "react"
import { beforeEach, describe, expect, it } from "vitest"
import { useLayoutStore } from "@/features/layout"
import { initLayoutSync } from "@/features/layout/sync"
import { useSettingsStore } from "@/features/settings"
import { LayoutSettings } from "@/features/settings/ui/LayoutSettings"

describe("LayoutSettings size lock behavior", () => {
  beforeEach(() => {
    useSettingsStore.getState().resetSettings()
    useLayoutStore.getState().resetLayout()
  })

  it("disables sidebar slider when lock is off and enables when on", async () => {
    const { getByLabelText } = render(<LayoutSettings />)

    // Initially disabled
    const sidebarInput = getByLabelText("Ширина сайдбара") as HTMLInputElement
    expect(sidebarInput.disabled).toBeTruthy()

    // Enable lock inside act and await re-render
    act(() => {
      useSettingsStore.getState().updatePanelLayout({ sidebarSizeLocked: true })
    })

    await waitFor(() => {
      const sidebarInputAfter = getByLabelText("Ширина сайдбара") as HTMLInputElement
      expect(sidebarInputAfter.disabled).toBeFalsy()
    })
  })

  it("applies sidebar size to runtime layout when locked via settings", () => {
    // Start sync
    const cleanup = initLayoutSync()

    // Toggle lock and set size
    useSettingsStore.getState().updatePanelLayout({ sidebarSizeLocked: true, sidebarSize: 28 })

    const runtime = useLayoutStore.getState()
    expect(runtime.layout.sidebarSize).toBe(28)

    cleanup?.()
  })
})
