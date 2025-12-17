import { useEffect } from "react"
import { useAppearanceSettings } from "../model/store"

export function useApplyAppearance() {
  const appearance = useAppearanceSettings()

  useEffect(() => {
    const root = document.documentElement

    // Theme
    root.classList.remove("light", "dark")
    if (appearance.theme === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      root.classList.add(prefersDark ? "dark" : "light")
    } else {
      root.classList.add(appearance.theme)
    }

    // Font size
    const fontSizes: Record<string, string> = { small: "14px", medium: "16px", large: "18px" }
    root.style.fontSize = fontSizes[appearance.fontSize] || "16px"

    // Accent color
    root.style.setProperty("--accent-color", appearance.accentColor)

    // Animations
    if (!appearance.enableAnimations || appearance.reducedMotion) {
      root.classList.add("reduce-motion")
    } else {
      root.classList.remove("reduce-motion")
    }
  }, [appearance])

  // Listen for system theme changes
  useEffect(() => {
    if (appearance.theme !== "system") return

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = (e: MediaQueryListEvent) => {
      document.documentElement.classList.remove("light", "dark")
      document.documentElement.classList.add(e.matches ? "dark" : "light")
    }

    mediaQuery.addEventListener("change", handler)
    return () => mediaQuery.removeEventListener("change", handler)
  }, [appearance.theme])
}
