import { applyAppearanceToRoot } from "@/features/settings/hooks/useApplyAppearance"

try {
  const raw = localStorage.getItem("app-settings")
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      const appearance = parsed?.state?.settings?.appearance ?? parsed?.settings?.appearance
      if (appearance) applyAppearanceToRoot(appearance)

      const remember =
        parsed?.state?.settings?.behavior?.rememberLastPath ??
        parsed?.settings?.behavior?.rememberLastPath
      if (remember === false) {
        try {
          localStorage.removeItem("navigation-storage")
        } catch {
          void 0
        }
      }
    } catch (_e) {
      void 0
    }
  }
} catch (_e) {
  void 0
}

import "@/app"
