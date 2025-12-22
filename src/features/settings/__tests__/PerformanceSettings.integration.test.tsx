import { fireEvent, render, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import { usePerformanceSettings } from "@/features/settings"
import { PerformanceSettings } from "@/features/settings/ui/PerformanceSettings"

function Combined() {
  const perf = usePerformanceSettings()
  return (
    <div>
      <PerformanceSettings />
      <div data-testid="perf-values">
        <span>lazy:{String(perf.lazyLoadImages)}</span>
        <span>cache:{String(perf.thumbnailCacheSize)}</span>
      </div>
    </div>
  )
}

import { useSettingsStore } from "@/features/settings"

describe("PerformanceSettings integration", () => {
  beforeEach(() => {
    // ensure default settings for isolation
    useSettingsStore.getState().resetSettings()
  })

  it("toggle 'Ленивая загрузка изображений' updates store and reflected in consumer", async () => {
    const { getByRole, getByTestId } = render(<Combined />)

    // Initially default is true
    await waitFor(() => {
      expect(getByTestId("perf-values").textContent).toContain("lazy:true")
    })

    const toggle = getByRole("switch", { name: /Ленивая загрузка изображений/i })
    fireEvent.click(toggle)

    await waitFor(() => {
      expect(getByTestId("perf-values").textContent).toContain("lazy:false")
    })
  })

  it("slider 'Размер кэша миниатюр' updates store and reflected in consumer", async () => {
    const { container, getByTestId } = render(<Combined />)

    const input = container.querySelector('input[type="range"]') as HTMLInputElement
    expect(input).toBeTruthy()

    // change to 150
    fireEvent.change(input, { target: { value: "150" } })

    await waitFor(() => {
      expect(getByTestId("perf-values").textContent).toContain("cache:150")
    })
  })
})
