import { act } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { useClipboardStore } from "../store"

describe("useClipboardStore", () => {
  beforeEach(() => {
    // Reset store before each test
    act(() => {
      useClipboardStore.getState().clear()
    })
  })

  afterEach(() => {
    act(() => {
      useClipboardStore.getState().clear()
    })
  })

  describe("initial state", () => {
    it("should have empty paths", () => {
      const { paths } = useClipboardStore.getState()
      expect(paths).toEqual([])
    })

    it("should have null action", () => {
      const { action } = useClipboardStore.getState()
      expect(action).toBeNull()
    })

    it("should report no content", () => {
      const { hasContent } = useClipboardStore.getState()
      expect(hasContent()).toBe(false)
    })

    it("should not be cut", () => {
      const { isCut } = useClipboardStore.getState()
      expect(isCut()).toBe(false)
    })
  })

  describe("copy", () => {
    it("should set paths and action to copy", () => {
      act(() => {
        useClipboardStore.getState().copy(["/path/to/file.txt"])
      })

      const state = useClipboardStore.getState()
      expect(state.paths).toEqual(["/path/to/file.txt"])
      expect(state.action).toBe("copy")
    })

    it("should handle multiple paths", () => {
      act(() => {
        useClipboardStore.getState().copy(["/file1.txt", "/file2.txt", "/folder"])
      })

      const { paths } = useClipboardStore.getState()
      expect(paths).toHaveLength(3)
    })

    it("should report hasContent as true after copy", () => {
      act(() => {
        useClipboardStore.getState().copy(["/file.txt"])
      })

      expect(useClipboardStore.getState().hasContent()).toBe(true)
    })

    it("should report isCut as false after copy", () => {
      act(() => {
        useClipboardStore.getState().copy(["/file.txt"])
      })

      expect(useClipboardStore.getState().isCut()).toBe(false)
    })

    it("should replace previous clipboard content", () => {
      act(() => {
        useClipboardStore.getState().copy(["/old.txt"])
        useClipboardStore.getState().copy(["/new.txt"])
      })

      const { paths } = useClipboardStore.getState()
      expect(paths).toEqual(["/new.txt"])
    })
  })

  describe("cut", () => {
    it("should set paths and action to cut", () => {
      act(() => {
        useClipboardStore.getState().cut(["/path/to/file.txt"])
      })

      const state = useClipboardStore.getState()
      expect(state.paths).toEqual(["/path/to/file.txt"])
      expect(state.action).toBe("cut")
    })

    it("should report isCut as true after cut", () => {
      act(() => {
        useClipboardStore.getState().cut(["/file.txt"])
      })

      expect(useClipboardStore.getState().isCut()).toBe(true)
    })

    it("should handle empty array", () => {
      act(() => {
        useClipboardStore.getState().cut([])
      })

      const state = useClipboardStore.getState()
      expect(state.paths).toEqual([])
      expect(state.action).toBe("cut")
      expect(state.hasContent()).toBe(false)
    })
  })

  describe("clear", () => {
    it("should clear paths and action", () => {
      act(() => {
        useClipboardStore.getState().copy(["/file.txt"])
        useClipboardStore.getState().clear()
      })

      const state = useClipboardStore.getState()
      expect(state.paths).toEqual([])
      expect(state.action).toBeNull()
    })

    it("should report hasContent as false after clear", () => {
      act(() => {
        useClipboardStore.getState().copy(["/file.txt"])
        useClipboardStore.getState().clear()
      })

      expect(useClipboardStore.getState().hasContent()).toBe(false)
    })
  })

  describe("switching between copy and cut", () => {
    it("should switch from copy to cut", () => {
      act(() => {
        useClipboardStore.getState().copy(["/file.txt"])
        useClipboardStore.getState().cut(["/other.txt"])
      })

      const state = useClipboardStore.getState()
      expect(state.action).toBe("cut")
      expect(state.paths).toEqual(["/other.txt"])
    })

    it("should switch from cut to copy", () => {
      act(() => {
        useClipboardStore.getState().cut(["/file.txt"])
        useClipboardStore.getState().copy(["/other.txt"])
      })

      const state = useClipboardStore.getState()
      expect(state.action).toBe("copy")
      expect(state.paths).toEqual(["/other.txt"])
    })
  })
})
