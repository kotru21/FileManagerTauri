import { act } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { useSelectionStore } from "../store"

describe("useSelectionStore", () => {
  beforeEach(() => {
    act(() => {
      useSelectionStore.getState().clearSelection()
    })
  })

  afterEach(() => {
    act(() => {
      useSelectionStore.getState().clearSelection()
    })
  })

  describe("initial state", () => {
    it("should have empty selection", () => {
      const { selectedPaths } = useSelectionStore.getState()
      expect(selectedPaths.size).toBe(0)
    })

    it("should have null lastSelectedPath", () => {
      const { lastSelectedPath } = useSelectionStore.getState()
      expect(lastSelectedPath).toBeNull()
    })
  })

  describe("selectFile", () => {
    it("should select a single file", () => {
      act(() => {
        useSelectionStore.getState().selectFile("/file.txt")
      })

      const state = useSelectionStore.getState()
      expect(state.selectedPaths.has("/file.txt")).toBe(true)
      expect(state.lastSelectedPath).toBe("/file.txt")
    })

    it("should replace selection without multiSelect", () => {
      act(() => {
        useSelectionStore.getState().selectFile("/file1.txt")
        useSelectionStore.getState().selectFile("/file2.txt")
      })

      const { selectedPaths } = useSelectionStore.getState()
      expect(selectedPaths.size).toBe(1)
      expect(selectedPaths.has("/file2.txt")).toBe(true)
      expect(selectedPaths.has("/file1.txt")).toBe(false)
    })

    it("should add to selection with multiSelect", () => {
      act(() => {
        useSelectionStore.getState().selectFile("/file1.txt")
        useSelectionStore.getState().selectFile("/file2.txt", true)
      })

      const { selectedPaths } = useSelectionStore.getState()
      expect(selectedPaths.size).toBe(2)
      expect(selectedPaths.has("/file1.txt")).toBe(true)
      expect(selectedPaths.has("/file2.txt")).toBe(true)
    })
  })

  describe("selectRange", () => {
    const allPaths = ["/a.txt", "/b.txt", "/c.txt", "/d.txt", "/e.txt"]

    it("should select range from start to end", () => {
      act(() => {
        useSelectionStore.getState().selectRange("/b.txt", "/d.txt", allPaths)
      })

      const { selectedPaths } = useSelectionStore.getState()
      expect(selectedPaths.size).toBe(3)
      expect(selectedPaths.has("/b.txt")).toBe(true)
      expect(selectedPaths.has("/c.txt")).toBe(true)
      expect(selectedPaths.has("/d.txt")).toBe(true)
    })

    it("should handle reverse range", () => {
      act(() => {
        useSelectionStore.getState().selectRange("/d.txt", "/b.txt", allPaths)
      })

      const { selectedPaths } = useSelectionStore.getState()
      expect(selectedPaths.size).toBe(3)
      expect(selectedPaths.has("/b.txt")).toBe(true)
      expect(selectedPaths.has("/c.txt")).toBe(true)
      expect(selectedPaths.has("/d.txt")).toBe(true)
    })

    it("should handle same start and end", () => {
      act(() => {
        useSelectionStore.getState().selectRange("/c.txt", "/c.txt", allPaths)
      })

      const { selectedPaths } = useSelectionStore.getState()
      expect(selectedPaths.size).toBe(1)
      expect(selectedPaths.has("/c.txt")).toBe(true)
    })

    it("should handle paths not in array", () => {
      act(() => {
        useSelectionStore.getState().selectRange("/x.txt", "/y.txt", allPaths)
      })

      const { selectedPaths } = useSelectionStore.getState()
      expect(selectedPaths.size).toBe(0)
    })
  })

  describe("toggleSelection", () => {
    it("should add unselected file", () => {
      act(() => {
        useSelectionStore.getState().toggleSelection("/file.txt")
      })

      expect(useSelectionStore.getState().isSelected("/file.txt")).toBe(true)
    })

    it("should remove selected file", () => {
      act(() => {
        useSelectionStore.getState().selectFile("/file.txt")
        useSelectionStore.getState().toggleSelection("/file.txt")
      })

      expect(useSelectionStore.getState().isSelected("/file.txt")).toBe(false)
    })
  })

  describe("clearSelection", () => {
    it("should clear all selections", () => {
      act(() => {
        useSelectionStore.getState().selectFile("/file1.txt")
        useSelectionStore.getState().selectFile("/file2.txt", true)
        useSelectionStore.getState().clearSelection()
      })

      const state = useSelectionStore.getState()
      expect(state.selectedPaths.size).toBe(0)
      expect(state.lastSelectedPath).toBeNull()
    })
  })

  describe("selectAll", () => {
    it("should select all provided paths", () => {
      const paths = ["/a.txt", "/b.txt", "/c.txt"]

      act(() => {
        useSelectionStore.getState().selectAll(paths)
      })

      const { selectedPaths } = useSelectionStore.getState()
      expect(selectedPaths.size).toBe(3)
      paths.forEach((path) => {
        expect(selectedPaths.has(path)).toBe(true)
      })
    })

    it("should handle empty array", () => {
      act(() => {
        useSelectionStore.getState().selectAll([])
      })

      expect(useSelectionStore.getState().selectedPaths.size).toBe(0)
    })
  })

  describe("isSelected", () => {
    it("should return true for selected files", () => {
      act(() => {
        useSelectionStore.getState().selectFile("/file.txt")
      })

      expect(useSelectionStore.getState().isSelected("/file.txt")).toBe(true)
    })

    it("should return false for unselected files", () => {
      expect(useSelectionStore.getState().isSelected("/file.txt")).toBe(false)
    })
  })

  describe("getSelectedPaths", () => {
    it("should return array of selected paths", () => {
      act(() => {
        useSelectionStore.getState().selectFile("/file1.txt")
        useSelectionStore.getState().selectFile("/file2.txt", true)
      })

      const paths = useSelectionStore.getState().getSelectedPaths()
      expect(paths).toHaveLength(2)
      expect(paths).toContain("/file1.txt")
      expect(paths).toContain("/file2.txt")
    })

    it("should return empty array when nothing selected", () => {
      const paths = useSelectionStore.getState().getSelectedPaths()
      expect(paths).toEqual([])
    })
  })
})
