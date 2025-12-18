/// <reference types="vitest" />
import { expect, it } from "vitest"
import { useSettingsStore } from "@/features/settings"
import { useViewModeStore } from "../model/store"

it("toggleHidden delegates to settings store", () => {
  useSettingsStore.getState().updateFileDisplay({ showHiddenFiles: false })

  useViewModeStore.getState().toggleHidden()
  expect(useSettingsStore.getState().settings.fileDisplay.showHiddenFiles).toBe(true)

  useViewModeStore.getState().toggleHidden()
  expect(useSettingsStore.getState().settings.fileDisplay.showHiddenFiles).toBe(false)
})
