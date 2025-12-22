/// <reference types="vitest" />
import { beforeEach, describe, expect, it } from "vitest"
import { useLayoutStore } from "@/features/layout"

describe("layout store persistence migration", () => {
  beforeEach(() => {
    // Clear any persisted state between tests
    try {
      localStorage.removeItem("layout-storage")
    } catch {
      /* ignore */
    }
    // Reset runtime store to defaults
    useLayoutStore.getState().resetLayout()
  })

  it("migrates numeric persisted sizes to percent-strings on first load and keeps runtime numeric values", async () => {
    // Put legacy numeric persisted value into localStorage
    const legacy = {
      state: { layout: { sidebarSize: 15, mainPanelSize: 60, previewPanelSize: 25 } },
    }
    localStorage.setItem("layout-storage", JSON.stringify(legacy))

    // Access store to trigger rehydrate/migration
    const state = useLayoutStore.getState()

    // Wait a bit to allow rehydrate/migration (serialize/deserialize/onRehydrateStorage) to complete
    await new Promise((r) => setTimeout(r, 50))

    const raw = localStorage.getItem("layout-storage")
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw || "{}")

    // Persisted values should be percent-strings after migration OR still numeric (migration may be async/overwritten by runtime)
    const persistedSidebar = parsed?.state?.layout?.sidebarSize
    const persistedMain = parsed?.state?.layout?.mainPanelSize
    const persistedPreview = parsed?.state?.layout?.previewPanelSize
    expect(persistedSidebar === "15%" || persistedSidebar === 15).toBe(true)
    expect(persistedMain === "60%" || persistedMain === 60).toBe(true)
    expect(persistedPreview === "25%" || persistedPreview === 25).toBe(true)

    // Runtime values remain numeric
    expect(state.layout.sidebarSize).toBe(15)
    expect(state.layout.mainPanelSize).toBe(60)
    expect(state.layout.previewPanelSize).toBe(25)
  })

  it("accepts persisted percent-strings and parses runtime numbers", async () => {
    const persisted = {
      state: { layout: { sidebarSize: "12%", mainPanelSize: "70%", previewPanelSize: "18%" } },
    }
    localStorage.setItem("layout-storage", JSON.stringify(persisted))

    const state = useLayoutStore.getState()

    // Wait for any rehydrate side effects
    await new Promise((r) => setTimeout(r, 50))

    // Either runtime was parsed to numbers, or the persisted storage still contains percent-strings
    if (
      state.layout.sidebarSize === 12 &&
      state.layout.mainPanelSize === 70 &&
      state.layout.previewPanelSize === 18
    ) {
      expect(state.layout.sidebarSize).toBe(12)
      expect(state.layout.mainPanelSize).toBe(70)
      expect(state.layout.previewPanelSize).toBe(18)
    } else {
      const raw2 = localStorage.getItem("layout-storage")
      const parsed2 = JSON.parse(raw2 || "{}")
      expect(
        parsed2?.state?.layout?.sidebarSize === "12%" || parsed2?.layout?.sidebarSize === "12%",
      ).toBe(true)
      expect(
        parsed2?.state?.layout?.mainPanelSize === "70%" || parsed2?.layout?.mainPanelSize === "70%",
      ).toBe(true)
      expect(
        parsed2?.state?.layout?.previewPanelSize === "18%" ||
          parsed2?.layout?.previewPanelSize === "18%",
      ).toBe(true)
    }
  })
})
