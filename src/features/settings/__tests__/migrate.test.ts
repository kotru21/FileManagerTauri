/// <reference types="vitest" />
import { describe, expect, it } from "vitest"
import { type AppSettings, migrateSettings } from "@/entities/app-settings"

// Note: migrateSettings should update persisted settings to the canonical schema

describe("migrateSettings", () => {
  it("fills missing fields and updates version", async () => {
    const persisted = {
      settings: {
        version: 0,
        layout: {
          panelLayout: {
            sidebarSize: 20,
            mainPanelSize: 60,
            previewPanelSize: 20,
            showSidebar: true,
            showPreview: true,
            columnWidths: { size: 0, date: 0, padding: 0 },
          },
        },
      },
    }

    const migrated = await migrateSettings(persisted, 0)

    expect(migrated).toBeTruthy()

    const m = migrated as { settings: AppSettings }

    expect(m.settings.version).toBeDefined()
    // Ensure showColumnHeadersInSimpleList exists after migration
    expect(m.settings.layout.showColumnHeadersInSimpleList).toBeDefined()
    // Ensure columnWidths were merged with sensible defaults (non-zero)
    expect(m.settings.layout.columnWidths.size).toBeGreaterThanOrEqual(50)

    // Ensure new keyboard shortcuts are present after migration (e.g. Ctrl+Z undo)
    const shortcuts = m.settings.keyboard.shortcuts
    expect(Array.isArray(shortcuts)).toBe(true)
    expect(shortcuts.some((s) => s.id === "undo" && s.keys.toLowerCase() === "ctrl+z")).toBe(true)
  })
})
