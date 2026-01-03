import { act } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"

import { useLayoutStore } from "../store"

describe("useLayoutStore", () => {
  beforeEach(async () => {
    try {
      localStorage.removeItem("layout-storage")
    } catch {
      void 0
    }

    // Ensure persisted state doesn't leak across tests
    await useLayoutStore.persist?.clearStorage?.()

    act(() => {
      useLayoutStore.getState().resetLayout()
    })
  })

  it("has expected defaults", () => {
    const s = useLayoutStore.getState()
    expect(s.layout.sidebarSize).toBe(15)
    expect(s.layout.mainPanelSize).toBe(60)
    expect(s.layout.previewPanelSize).toBe(25)
    expect(s.layout.showSidebar).toBe(true)
    expect(s.layout.showPreview).toBe(true)

    expect(s.layout.columnWidths.size).toBe(100)
    expect(s.layout.columnWidths.date).toBe(180)
    expect(s.layout.columnWidths.padding).toBe(8)

    expect(s.layout.expandedSections?.bookmarks).toBe(true)
    expect(s.layout.expandedSections?.recent).toBe(true)
  })

  it("setLayout shallow-merges updates", () => {
    act(() => {
      useLayoutStore.getState().setLayout({ showSidebar: false, sidebarCollapsed: true })
    })

    const s = useLayoutStore.getState().layout
    expect(s.showSidebar).toBe(false)
    expect(s.sidebarCollapsed).toBe(true)
    // unchanged
    expect(s.sidebarSize).toBe(15)
  })

  it("size setters accept numbers and percent-strings (legacy)", () => {
    act(() => {
      useLayoutStore.getState().setSidebarSize(10)
      useLayoutStore.getState().setMainPanelSize("70%" as unknown as number)
      useLayoutStore.getState().setPreviewPanelSize("20%" as unknown as number)
    })

    const s = useLayoutStore.getState().layout
    expect(s.sidebarSize).toBe(10)
    expect(s.mainPanelSize).toBe(70)
    expect(s.previewPanelSize).toBe(20)
  })

  it("setColumnWidth updates only specified column", () => {
    act(() => {
      useLayoutStore.getState().setColumnWidth("size", 111)
    })

    const s = useLayoutStore.getState().layout.columnWidths
    expect(s.size).toBe(111)
    expect(s.date).toBe(180)
    expect(s.padding).toBe(8)
  })

  it("toggleSidebar/togglePreview invert visibility", () => {
    const before = useLayoutStore.getState().layout

    act(() => {
      useLayoutStore.getState().toggleSidebar()
      useLayoutStore.getState().togglePreview()
    })

    const after = useLayoutStore.getState().layout
    expect(after.showSidebar).toBe(!before.showSidebar)
    expect(after.showPreview).toBe(!before.showPreview)
  })

  it("setSectionExpanded and toggleSectionExpanded work with missing sections", () => {
    act(() => {
      useLayoutStore.getState().setSectionExpanded("custom", false)
    })

    expect(useLayoutStore.getState().layout.expandedSections?.custom).toBe(false)

    act(() => {
      useLayoutStore.getState().toggleSectionExpanded("custom")
    })

    expect(useLayoutStore.getState().layout.expandedSections?.custom).toBe(true)

    // missing key defaults to expanded=true, so toggle -> false
    act(() => {
      useLayoutStore.getState().toggleSectionExpanded("missing")
    })

    expect(useLayoutStore.getState().layout.expandedSections?.missing).toBe(false)
  })

  it("applyLayout preserves runtime expandedSections when already set", () => {
    act(() => {
      useLayoutStore.getState().setSectionExpanded("bookmarks", false)
    })

    const runtimeExpanded = useLayoutStore.getState().layout.expandedSections
    expect(runtimeExpanded?.bookmarks).toBe(false)

    act(() => {
      useLayoutStore.getState().applyLayout({
        ...useLayoutStore.getState().layout,
        showSidebar: false,
        expandedSections: { bookmarks: true },
      })
    })

    const after = useLayoutStore.getState().layout
    expect(after.showSidebar).toBe(false)
    // preserved from runtime
    expect(after.expandedSections?.bookmarks).toBe(false)
  })

  it("rehydrate merges persisted layout and parses size values", async () => {
    const legacy = {
      state: {
        layout: {
          sidebarSize: "10%",
          mainPanelSize: "70%",
          previewPanelSize: 20,
          showSidebar: false,
          showPreview: false,
          sidebarCollapsed: true,
          sidebarSizeLocked: true,
          previewSizeLocked: true,
          expandedSections: { bookmarks: false },
          columnWidths: { size: 123 },
        },
      },
    }
    localStorage.setItem("layout-storage", JSON.stringify(legacy))

    await useLayoutStore.persist.rehydrate()

    const s = useLayoutStore.getState().layout
    expect(s.sidebarSize).toBe(10)
    expect(s.mainPanelSize).toBe(70)
    expect(s.previewPanelSize).toBe(20)

    expect(s.showSidebar).toBe(false)
    expect(s.showPreview).toBe(false)
    expect(s.sidebarCollapsed).toBe(true)

    expect(s.sidebarSizeLocked).toBe(true)
    expect(s.previewSizeLocked).toBe(true)

    expect(s.expandedSections?.bookmarks).toBe(false)

    // columnWidths should be merged with defaults
    expect(s.columnWidths.size).toBe(123)
    expect(s.columnWidths.date).toBe(180)
    expect(s.columnWidths.padding).toBe(8)
  })
})
