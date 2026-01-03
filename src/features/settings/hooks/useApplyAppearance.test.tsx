import { cleanup, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useSettingsStore } from "@/entities/app-settings"
import { applyAppearanceToRoot, useApplyAppearance } from "./useApplyAppearance"

function TestHookRunner() {
  useApplyAppearance()
  return null
}

describe("applyAppearanceToRoot and useApplyAppearance", () => {
  beforeEach(() => {
    // Reset DOM classes and styles
    document.documentElement.className = ""
    document.documentElement.style.cssText = ""
    // Reset settings store to defaults
    useSettingsStore.setState({ settings: useSettingsStore.getState().settings })
    // Clear localStorage to avoid interference
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it("applies theme, font size, accent color and animations", () => {
    applyAppearanceToRoot({
      theme: "dark",
      fontSize: "large",
      accentColor: "#ff0000",
      enableAnimations: true,
      reducedMotion: false,
    })

    expect(document.documentElement.classList.contains("dark")).toBe(true)
    expect(document.documentElement.style.fontSize).toBe("18px")
    expect(document.documentElement.style.getPropertyValue("--accent-color")).toBe("#ff0000")
    expect(document.documentElement.style.getPropertyValue("--color-primary")).toBe("#ff0000")
    expect(document.documentElement.style.getPropertyValue("--color-primary-foreground")).toBe(
      "#ffffff",
    )
    expect(document.documentElement.classList.contains("reduce-motion")).toBe(false)
    expect(document.documentElement.style.getPropertyValue("--transition-duration")).toBe("150ms")
  })

  it("applies reduced motion when enabled", () => {
    applyAppearanceToRoot({
      theme: "light",
      fontSize: "medium",
      accentColor: "#00ff00",
      enableAnimations: false,
      reducedMotion: true,
    })

    expect(document.documentElement.classList.contains("reduce-motion")).toBe(true)
    expect(document.documentElement.style.getPropertyValue("--transition-duration")).toBe("0ms")
  })

  it("accepts non-hex accent values gracefully", () => {
    applyAppearanceToRoot({
      theme: "light",
      fontSize: "medium",
      accentColor: "not-a-color",
      enableAnimations: true,
      reducedMotion: false,
    })

    expect(document.documentElement.style.getPropertyValue("--accent-color")).toBe("not-a-color")
  })

  it("listens and reacts to system theme changes when theme=system", () => {
    // Mock matchMedia
    let changeHandler: ((e: MediaQueryListEvent) => void) | null = null
    const mockMatchMedia = vi.fn().mockImplementation((query) => {
      return {
        matches: false,
        media: query,
        addEventListener: (_: string, handler: (e: MediaQueryListEvent) => void) => {
          changeHandler = handler
        },
        removeEventListener: (_: string, _handler: (e: MediaQueryListEvent) => void) => {
          changeHandler = null
        },
      }
    })

    window.matchMedia = mockMatchMedia

    // Set settings to system theme
    useSettingsStore.getState().updateAppearance({ theme: "system" })

    // Render hook to install listener
    render(<TestHookRunner />)

    // Initially, since mocked matches=false, expect 'light' class
    expect(document.documentElement.classList.contains("light")).toBe(true)

    // Simulate system change to dark
    if (changeHandler) {
      // TS typing in JSDOM mocks can be subtle — cast to any for invocation
      ;(changeHandler as unknown as (e: MediaQueryListEvent) => void)({
        matches: true,
        media: "(prefers-color-scheme: dark)",
      } as unknown as MediaQueryListEvent)
      expect(document.documentElement.classList.contains("dark")).toBe(true)
    } else {
      throw new Error("matchMedia handler was not registered")
    }
  })

  it("useApplyAppearance applies settings from store on mount", () => {
    // Update settings
    useSettingsStore
      .getState()
      .updateAppearance({ theme: "dark", fontSize: "small", accentColor: "#123456" })

    render(<TestHookRunner />)

    expect(document.documentElement.classList.contains("dark")).toBe(true)
    expect(document.documentElement.style.fontSize).toBe("14px")
    expect(document.documentElement.style.getPropertyValue("--accent-color")).toBe("#123456")
  })
})
