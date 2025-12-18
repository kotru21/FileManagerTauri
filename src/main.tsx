import { applyAppearanceToRoot } from "@/features/settings/hooks/useApplyAppearance"

// Try to apply persisted appearance settings before React mounts to avoid FOUC.
try {
  const raw = localStorage.getItem("app-settings")
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      // Zustand persist can store { state: { settings: { appearance: ... } } } or { settings }
      const appearance = parsed?.state?.settings?.appearance ?? parsed?.settings?.appearance
      if (appearance) applyAppearanceToRoot(appearance)

      // If user disabled remembering last path, clear navigation storage so app starts fresh
      const remember =
        parsed?.state?.settings?.behavior?.rememberLastPath ??
        parsed?.settings?.behavior?.rememberLastPath
      if (remember === false) {
        try {
          localStorage.removeItem("navigation-storage")
        } catch {
          // ignore
        }
      }
    } catch (_e) {
      // ignore parse errors
    }
  }
} catch (_e) {
  // ignore localStorage access errors (e.g., in restricted envs)
}

import "@/app"
