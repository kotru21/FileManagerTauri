/// <reference types="vitest" />
import { describe, expect, it } from "vitest"
import { migrateSettings } from "@/entities/app-settings"

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
    // @ts-expect-error
    expect(migrated.settings.version).toBeDefined()
    // Ensure showColumnHeadersInSimpleList exists after migration
    // @ts-expect-error
    expect(migrated.settings.layout.showColumnHeadersInSimpleList).toBeDefined()
    // Ensure columnWidths were merged with sensible defaults (non-zero)
    // @ts-expect-error
    expect(migrated.settings.layout.columnWidths.size).toBeGreaterThanOrEqual(50)
  })
})
