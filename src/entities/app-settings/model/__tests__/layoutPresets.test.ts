import { getPresetLayout, isCustomLayout, layoutPresets } from "../layoutPresets"

describe("layoutPresets", () => {
  describe("getPresetLayout", () => {
    it("returns default preset layout", () => {
      const layout = getPresetLayout("default")
      expect(layout.sidebarSize).toBe(20)
      expect(layout.mainPanelSize).toBe(55)
      expect(layout.previewPanelSize).toBe(25)
      expect(layout.showSidebar).toBe(true)
      expect(layout.sidebarCollapsed).toBe(false)
      expect(layout.showPreview).toBe(true)
    })

    it("returns compact preset layout", () => {
      const layout = getPresetLayout("compact")
      expect(layout.sidebarSize).toBe(15)
      expect(layout.mainPanelSize).toBe(85)
      expect(layout.previewPanelSize).toBe(0)
      expect(layout.sidebarCollapsed).toBe(true)
      expect(layout.showPreview).toBe(false)
    })

    it("returns wide preset layout", () => {
      const layout = getPresetLayout("wide")
      expect(layout.sidebarSize).toBe(25)
      expect(layout.mainPanelSize).toBe(40)
      expect(layout.previewPanelSize).toBe(35)
      expect(layout.showPreview).toBe(true)
    })

    it("returns custom preset layout", () => {
      const layout = getPresetLayout("custom")
      expect(layout).toEqual(layoutPresets.custom.layout)
    })

    it("falls back to default for unknown preset id", () => {
      const layout = getPresetLayout("nonexistent" as never)
      expect(layout).toEqual(layoutPresets.default.layout)
    })
  })

  describe("isCustomLayout", () => {
    it("returns true for custom preset id regardless of layout", () => {
      expect(isCustomLayout(layoutPresets.default.layout, "custom")).toBe(true)
    })

    it("returns false when layout matches preset exactly", () => {
      expect(isCustomLayout({ ...layoutPresets.default.layout }, "default")).toBe(false)
    })

    it("returns true when sidebarSize differs", () => {
      const modified = { ...layoutPresets.default.layout, sidebarSize: 30 }
      expect(isCustomLayout(modified, "default")).toBe(true)
    })

    it("returns true when showPreview differs", () => {
      const modified = { ...layoutPresets.default.layout, showPreview: false }
      expect(isCustomLayout(modified, "default")).toBe(true)
    })

    it("returns true when sidebarCollapsed differs", () => {
      const modified = { ...layoutPresets.default.layout, sidebarCollapsed: true }
      expect(isCustomLayout(modified, "default")).toBe(true)
    })

    it("returns true when mainPanelSize differs", () => {
      const modified = { ...layoutPresets.default.layout, mainPanelSize: 70 }
      expect(isCustomLayout(modified, "default")).toBe(true)
    })

    it("returns true when previewPanelSize differs", () => {
      const modified = { ...layoutPresets.default.layout, previewPanelSize: 50 }
      expect(isCustomLayout(modified, "default")).toBe(true)
    })

    it("returns true when showSidebar differs", () => {
      const modified = { ...layoutPresets.default.layout, showSidebar: false }
      expect(isCustomLayout(modified, "default")).toBe(true)
    })

    it("returns true for unknown preset id", () => {
      expect(isCustomLayout(layoutPresets.default.layout, "unknown" as never)).toBe(true)
    })
  })

  describe("preset definitions", () => {
    it("has all four presets defined", () => {
      expect(Object.keys(layoutPresets)).toEqual(
        expect.arrayContaining(["compact", "default", "wide", "custom"]),
      )
    })

    it("each preset has id, name, description, and layout", () => {
      for (const [key, preset] of Object.entries(layoutPresets)) {
        expect(preset.id).toBe(key)
        expect(preset.name).toBeTruthy()
        expect(preset.description).toBeTruthy()
        expect(preset.layout).toBeDefined()
        expect(preset.layout.sidebarSize).toBeGreaterThanOrEqual(0)
        expect(preset.layout.mainPanelSize).toBeGreaterThan(0)
      }
    })
  })
})
