import { useMemo } from "react"
import type { AppearanceSettings, FileDisplaySettings } from "@/features/settings"

export function useFileExplorer({
  displaySettings,
  appearance,
}: {
  displaySettings?: FileDisplaySettings
  appearance?: AppearanceSettings
}) {
  const display = useMemo(() => {
    return (
      displaySettings ??
      ({
        showFileExtensions: true,
        showFileSizes: true,
        showFileDates: true,
        showHiddenFiles: false,
        dateFormat: "relative",
        thumbnailSize: "medium",
      } as FileDisplaySettings)
    )
  }, [displaySettings])

  const appearanceLocal = useMemo(() => {
    return (appearance ?? {
      theme: "system",
      fontSize: "medium",
      accentColor: "#0078d4",
      enableAnimations: true,
      reducedMotion: false,
    }) as AppearanceSettings
  }, [appearance])

  return { display, appearanceLocal }
}
