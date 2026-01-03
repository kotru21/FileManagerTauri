import { useEffect, useLayoutEffect } from "react"
import type { AppearanceSettings } from "@/entities/app-settings"
import { useAppearanceSettings } from "@/entities/app-settings"

export function applyAppearanceToRoot(appearance: AppearanceSettings) {
  try {
    const root = document.documentElement

    root.classList.remove("light", "dark")
    if (appearance.theme === "system") {
      const prefersDark =
        typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
      root.classList.add(prefersDark ? "dark" : "light")
    } else {
      root.classList.add(appearance.theme)
    }

    const fontSizes: Record<string, string> = { small: "14px", medium: "16px", large: "18px" }
    root.style.fontSize = fontSizes[appearance.fontSize] || "16px"

    const isHex = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(appearance.accentColor)
    if (isHex) {
      root.style.setProperty("--accent-color", appearance.accentColor)
      root.style.setProperty("--color-primary", appearance.accentColor)
      try {
        const hex = appearance.accentColor.replace("#", "")
        const r = parseInt(hex.substring(0, 2), 16)
        const g = parseInt(hex.substring(2, 4), 16)
        const b = parseInt(hex.substring(4, 6), 16)
        const brightness = (r * 299 + g * 587 + b * 114) / 1000
        const fg = brightness > 160 ? "#000000" : "#ffffff"
        root.style.setProperty("--color-primary-foreground", fg)
        root.style.setProperty("--accent-color-foreground", fg)
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
        void 0
      }
    } else if (!appearance.accentColor) {
      root.style.removeProperty("--accent-color")
      root.style.removeProperty("--color-primary")
      root.style.removeProperty("--color-primary-foreground")
      root.style.removeProperty("--accent-color-foreground")
    } else {
      try {
        root.style.setProperty("--accent-color", appearance.accentColor)
        root.style.setProperty("--color-primary", appearance.accentColor)
      } catch {
        void 0
      }
    }

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

    if (!appearance.enableAnimations || appearance.reducedMotion) {
      root.style.setProperty("--transition-duration", "0ms")
    } else {
      root.style.setProperty("--transition-duration", "150ms")
    }

    const opacity = typeof appearance.popoverOpacity === "number" ? appearance.popoverOpacity : 0.6
    const blurRadius =
      typeof appearance.popoverBlurRadius === "number" ? `${appearance.popoverBlurRadius}px` : "6px"

    const isLight = document.documentElement.classList.contains("light")
    if (appearance.popoverTranslucent === false) {
      root.style.removeProperty("--popover-opacity")
      root.style.removeProperty("--popover-blur")
      root.style.removeProperty("--popover-bg")
    } else {
      root.style.setProperty("--popover-opacity", String(opacity))
      root.style.setProperty("--popover-blur", blurRadius)

      if (isLight) {
        root.style.setProperty("--popover-bg", `rgba(255,255,255,${opacity})`)
        root.style.setProperty("--popover-border", "rgba(0,0,0,0.06)")
      } else {
        root.style.setProperty("--popover-bg", `rgba(17,17,19,${opacity})`)
        root.style.setProperty("--popover-border", "rgba(255,255,255,0.06)")
      }

      if (appearance.popoverBlur === false) {
        root.style.setProperty("--popover-blur", "0px")
      }
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("applyAppearanceToRoot: failed to apply appearance", e)
  }
}

export function useApplyAppearance() {
  const appearance = useAppearanceSettings()

  useLayoutEffect(() => {
    applyAppearanceToRoot(appearance)
  }, [appearance])

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
