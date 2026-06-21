/// <reference types="vitest" />

import "@testing-library/jest-dom/vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { act } from "react"
import { useSettingsStore } from "@/entities/app-settings"
import { SettingsDialog } from "../SettingsDialog"

describe("SettingsDialog coverage", () => {
  beforeEach(() => {
    act(() => {
      useSettingsStore.getState().resetSettings()
      useSettingsStore.getState().close()
    })
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true),
    )
    URL.createObjectURL = vi.fn(() => "blob:settings")
    URL.revokeObjectURL = vi.fn()
  })

  it("renders tabs and switches content", () => {
    act(() => {
      useSettingsStore.getState().open()
      useSettingsStore.getState().setActiveTab("layout")
    })

    render(<SettingsDialog />)
    expect(screen.getByRole("dialog")).toBeInTheDocument()

    act(() => {
      useSettingsStore.getState().setActiveTab("keyboard")
    })
    expect(screen.getByRole("dialog")).toBeInTheDocument()
  })

  it("exports settings to downloadable blob", () => {
    act(() => useSettingsStore.getState().open())
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {})

    render(<SettingsDialog />)
    fireEvent.click(screen.getByTitle("Экспорт настроек"))

    expect(URL.createObjectURL).toHaveBeenCalled()
    expect(clickSpy).toHaveBeenCalled()
    clickSpy.mockRestore()
  })

  it("imports settings from selected json file", async () => {
    act(() => useSettingsStore.getState().open())
    render(<SettingsDialog />)

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['{"version":1}'], "settings.json", { type: "application/json" })

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } })
    })
  })

  it("resets settings when confirmed", () => {
    const resetSpy = vi.spyOn(useSettingsStore.getState(), "resetSettings")
    act(() => useSettingsStore.getState().open())
    render(<SettingsDialog />)

    fireEvent.click(screen.getByTitle("Сбросить все настройки"))
    expect(resetSpy).toHaveBeenCalled()
  })
})
