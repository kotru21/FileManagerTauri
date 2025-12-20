import { useEffect, useLayoutEffect } from "react"
import { useAppearanceSettings } from "../model/store"
import type { AppearanceSettings } from "../model/types"

export function applyAppearanceToRoot(appearance: AppearanceSettings) {
  try {
    const root = document.documentElement

    // Theme
    root.classList.remove("light", "dark")
    if (appearance.theme === "system") {
      const prefersDark =
        typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
      root.classList.add(prefersDark ? "dark" : "light")
    } else {
      root.classList.add(appearance.theme)
    }

    // Font size
    const fontSizes: Record<string, string> = { small: "14px", medium: "16px", large: "18px" }
    root.style.fontSize = fontSizes[appearance.fontSize] || "16px"

    // Accent color - validate basic HEX format (allow 3/4/6/8 hex)
    const isHex = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(appearance.accentColor)
    if (isHex) {
      // Set canonical variable
      root.style.setProperty("--accent-color", appearance.accentColor)

      // Also set primary color to the accent for consistency in UI tokens
      root.style.setProperty("--color-primary", appearance.accentColor)

      // Compute a readable foreground (white or black) for the accent
      try {
        const hex = appearance.accentColor.replace("#", "")
        const r = parseInt(hex.substring(0, 2), 16)
        const g = parseInt(hex.substring(2, 4), 16)
        const b = parseInt(hex.substring(4, 6), 16)
        // Perceived brightness
        const brightness = (r * 299 + g * 587 + b * 114) / 1000
        const fg = brightness > 160 ? "#000000" : "#ffffff"
        root.style.setProperty("--color-primary-foreground", fg)
        root.style.setProperty("--accent-color-foreground", fg)

        // Also set RGB variables for tailwind color-with-alpha support
        root.style.setProperty("--accent-color-rgb", `${r} ${g} ${b}`)
        root.style.setProperty("--color-primary-rgb", `${r} ${g} ${b}`)
        root.style.setProperty(
          "--accent-color-foreground-rgb",
          `${parseInt(fg.slice(1, 3), 16)} ${parseInt(fg.slice(3, 5), 16)} ${parseInt(fg.slice(5, 7), 16)}`,
        )
        root.style.setProperty(
          "--color-primary-foreground-rgb",
          `${parseInt(fg.slice(1, 3), 16)} ${parseInt(fg.slice(3, 5), 16)} ${parseInt(fg.slice(5, 7), 16)}`,
        )
      } catch {
        // ignore parsing errors
      }
    } else if (!appearance.accentColor) {
      root.style.removeProperty("--accent-color")
      root.style.removeProperty("--color-primary")
      root.style.removeProperty("--color-primary-foreground")
      root.style.removeProperty("--accent-color-foreground")
    } else {
      // Fallback: try applying as-is but guard against throwing
      try {
        root.style.setProperty("--accent-color", appearance.accentColor)
        root.style.setProperty("--color-primary", appearance.accentColor)
      } catch {
        // ignore invalid color value
      }
    }

    // Animations / reduced motion
    // Keep separate classes for explicit "animations off" and reduced-motion preference
    if (!appearance.enableAnimations) {
      root.classList.add("animations-off")
    } else {
      root.classList.remove("animations-off")
    }

    if (appearance.reducedMotion) {
      root.classList.add("reduce-motion")
    } else {
      root.classList.remove("reduce-motion")
    }

    // If either flag disables transitions, set transition duration to 0
    if (!appearance.enableAnimations || appearance.reducedMotion) {
      root.style.setProperty("--transition-duration", "0ms")
    } else {
      root.style.setProperty("--transition-duration", "150ms")
    }

    // Popover visual settings (translucent + blur)
    // Compute and apply CSS variables used by .popover-surface
    const opacity = typeof appearance.popoverOpacity === "number" ? appearance.popoverOpacity : 0.6
    const blurRadius =
      typeof appearance.popoverBlurRadius === "number" ? `${appearance.popoverBlurRadius}px` : "6px"

    // For dark/light base color, prefer existing variables; compute popover bg using opacity
    const isLight = document.documentElement.classList.contains("light")
    if (appearance.popoverTranslucent === false) {
      // Remove translucency variables
      root.style.removeProperty("--popover-opacity")
      root.style.removeProperty("--popover-blur")
      root.style.removeProperty("--popover-bg")
    } else {
      // Apply opacity & blur; and update base RGBA depending on theme
      root.style.setProperty("--popover-opacity", String(opacity))
      root.style.setProperty("--popover-blur", blurRadius)

      if (isLight) {
        // light theme: white base
        root.style.setProperty("--popover-bg", `rgba(255,255,255,${opacity})`)
        root.style.setProperty("--popover-border", "rgba(0,0,0,0.06)")
      } else {
        root.style.setProperty("--popover-bg", `rgba(17,17,19,${opacity})`)
        root.style.setProperty("--popover-border", "rgba(255,255,255,0.06)")
      }

      // If blur is disabled, set blur to 0
      if (appearance.popoverBlur === false) {
        root.style.setProperty("--popover-blur", "0px")
      }
    }
  } catch (e) {
    // In environments without DOM, do nothing
    // eslint-disable-next-line no-console
    console.warn("applyAppearanceToRoot: failed to apply appearance", e)
  }
}

export function useApplyAppearance() {
  const appearance = useAppearanceSettings()

  // Apply synchronously to avoid FOUC
  useLayoutEffect(() => {
    applyAppearanceToRoot(appearance)
  }, [appearance])

  // Listen for system theme changes when theme === 'system'
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
