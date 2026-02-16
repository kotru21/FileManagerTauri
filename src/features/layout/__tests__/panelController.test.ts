import type { PanelLayout } from "@/entities/layout"
import {
  applyLayoutToPanels,
  forceCollapseSidebar,
  forceExpandSidebar,
  registerPreview,
  registerSidebar,
} from "../panelController"

function createMockRef() {
  return {
    current: {
      collapse: vi.fn(),
      expand: vi.fn(),
      getId: vi.fn(() => "panel-1"),
      getSize: vi.fn(() => ({ asPercentage: 20, inPixels: 200 })),
      isCollapsed: vi.fn(() => false),
      isExpanded: vi.fn(() => true),
      resize: vi.fn(),
    },
  }
}

const baseLayout: PanelLayout = {
  sidebarSize: 20,
  mainPanelSize: 55,
  previewPanelSize: 25,
  showSidebar: true,
  sidebarCollapsed: false,
  showPreview: true,
  columnWidths: { size: 90, date: 140, padding: 16 },
  sidebarSizeLocked: false,
  previewSizeLocked: false,
}

describe("panelController", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    registerSidebar(null)
    registerPreview(null)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe("applyLayoutToPanels", () => {
    it("calls collapse on sidebar when sidebarCollapsed is true", () => {
      const ref = createMockRef()
      registerSidebar(ref)

      applyLayoutToPanels({ ...baseLayout, sidebarCollapsed: true })
      vi.runAllTimers()

      expect(ref.current.collapse).toHaveBeenCalled()
      expect(ref.current.expand).not.toHaveBeenCalled()
    })

    it("calls expand on sidebar when sidebarCollapsed is false", () => {
      const ref = createMockRef()
      registerSidebar(ref)

      applyLayoutToPanels({ ...baseLayout, sidebarCollapsed: false })
      vi.runAllTimers()

      expect(ref.current.expand).toHaveBeenCalled()
      expect(ref.current.collapse).not.toHaveBeenCalled()
    })

    it("does not throw when sidebar ref is null", () => {
      expect(() => {
        applyLayoutToPanels({ ...baseLayout, sidebarCollapsed: true })
        vi.runAllTimers()
      }).not.toThrow()
    })
  })

  describe("forceCollapseSidebar", () => {
    it("calls collapse on registered sidebar ref", () => {
      const ref = createMockRef()
      registerSidebar(ref)

      forceCollapseSidebar()
      vi.runAllTimers()

      expect(ref.current.collapse).toHaveBeenCalled()
    })

    it("does not throw when sidebar ref is null", () => {
      expect(() => {
        forceCollapseSidebar()
        vi.runAllTimers()
      }).not.toThrow()
    })
  })

  describe("forceExpandSidebar", () => {
    it("calls expand on registered sidebar ref", () => {
      const ref = createMockRef()
      registerSidebar(ref)

      forceExpandSidebar()
      vi.runAllTimers()

      expect(ref.current.expand).toHaveBeenCalled()
    })

    it("does not throw when sidebar ref is null", () => {
      expect(() => {
        forceExpandSidebar()
        vi.runAllTimers()
      }).not.toThrow()
    })
  })

  describe("registerSidebar", () => {
    it("replaces previous ref with new ref", () => {
      const ref1 = createMockRef()
      const ref2 = createMockRef()

      registerSidebar(ref1)
      registerSidebar(ref2)

      forceCollapseSidebar()
      vi.runAllTimers()

      expect(ref1.current.collapse).not.toHaveBeenCalled()
      expect(ref2.current.collapse).toHaveBeenCalled()
    })
  })
})
