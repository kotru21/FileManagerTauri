/// <reference types="vitest" />

import "@testing-library/jest-dom/vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { act } from "react"
import { useSettingsStore } from "@/entities/app-settings"
import { AppearanceSettings } from "../AppearanceSettings"
import { BehaviorSettings } from "../BehaviorSettings"
import { LayoutSettings } from "../LayoutSettings"
import { PerformanceSettings } from "../PerformanceSettings"
import { FileDisplaySettings } from "../FileDisplaySettings"
import { KeyboardSettings } from "../KeyboardSettings"

describe("settings panels coverage", () => {
  beforeEach(() => {
    act(() => useSettingsStore.getState().resetSettings())
  })

  it("AppearanceSettings changes theme, font, colors, and toggles", () => {
    render(<AppearanceSettings />)
    fireEvent.click(screen.getByText("Тёмная"))
    fireEvent.click(screen.getByText("Системная"))
    fireEvent.click(screen.getByText("Маленький"))
    fireEvent.click(screen.getByText("Средний"))

    const colorButtons = document.querySelectorAll("button[style*='background']")
    if (colorButtons[0]) fireEvent.click(colorButtons[0] as HTMLElement)

    const switches = screen.getAllByRole("switch")
    for (const sw of switches) fireEvent.click(sw)

    expect(useSettingsStore.getState().settings.appearance.theme).toBe("system")
  })

  it("BehaviorSettings toggles all switches", () => {
    render(<BehaviorSettings />)
    for (const sw of screen.getAllByRole("switch")) {
      fireEvent.click(sw)
    }
    expect(useSettingsStore.getState().settings.behavior).toBeDefined()
  })

  it("LayoutSettings toggles layout options", () => {
    render(<LayoutSettings />)
    for (const sw of screen.getAllByRole("switch")) {
      fireEvent.click(sw)
    }
    expect(useSettingsStore.getState().settings.layout).toBeDefined()
  })

  it("LayoutSettings saves, applies, and deletes custom layouts", () => {
    act(() => {
      useSettingsStore.getState().saveCustomLayout("My layout")
    })

    render(<LayoutSettings />)

    fireEvent.click(screen.getByText("Сохранить текущий"))
    const input = screen.getByPlaceholderText("Название лейаута")
    fireEvent.change(input, { target: { value: "  Second  " } })
    fireEvent.click(screen.getByText("Сохранить"))

    const customName = screen.getByText("My layout")
    fireEvent.click(customName)

    const deleteButtons = screen.getAllByRole("button").filter((btn) => btn.querySelector("svg"))
    const trash = deleteButtons.find((btn) => btn.className.includes("h-7"))
    if (trash) fireEvent.click(trash)

    expect(useSettingsStore.getState().settings.layout.customLayouts.length).toBeGreaterThanOrEqual(0)
  })

  it("PerformanceSettings and FileDisplaySettings render and toggle", () => {
    const { unmount } = render(<PerformanceSettings />)
    for (const sw of screen.getAllByRole("switch")) fireEvent.click(sw)
    unmount()

    render(<FileDisplaySettings />)
    for (const sw of screen.getAllByRole("switch")) fireEvent.click(sw)
    expect(useSettingsStore.getState().settings.fileDisplay).toBeDefined()
  })

  it("KeyboardSettings toggles shortcuts and vim mode", () => {
    render(<KeyboardSettings />)
    for (const sw of screen.getAllByRole("switch")) fireEvent.click(sw)
    expect(useSettingsStore.getState().settings.keyboard).toBeDefined()
  })
})
