import { renderHook } from "@testing-library/react"
import { act } from "react"
import { useSelection, useSelectionActions, useSelectionState, useSelectionUtils } from "../hooks"
import { useSelectionStore } from "../store"

describe("file-selection hooks coverage", () => {
  beforeEach(() => {
    act(() => useSelectionStore.getState().clearSelection())
  })

  it("useSelectionState returns selected paths", () => {
    act(() => useSelectionStore.getState().selectFile("/a.txt"))
    const { result } = renderHook(() => useSelectionState())
    expect(result.current.lastSelectedPath).toBe("/a.txt")
    expect(result.current.selectedPaths.has("/a.txt")).toBe(true)
  })

  it("useSelectionActions mutates selection", () => {
    const { result } = renderHook(() => useSelectionActions())
    act(() => {
      result.current.selectFile("/b.txt")
      result.current.toggleSelection("/c.txt")
      result.current.selectAll(["/d.txt", "/e.txt"])
    })
    expect(useSelectionStore.getState().getSelectedPaths().length).toBeGreaterThan(0)
  })

  it("useSelectionUtils exposes helpers", () => {
    act(() => useSelectionStore.getState().selectFile("/z.txt"))
    const { result } = renderHook(() => useSelectionUtils())
    expect(result.current.isSelected("/z.txt")).toBe(true)
    expect(result.current.getSelectedPaths()).toContain("/z.txt")
  })

  it("useSelection combines state, actions, and utils", () => {
    const { result } = renderHook(() => useSelection())
    act(() => result.current.selectFile("/combo.txt"))
    expect(result.current.isSelected("/combo.txt")).toBe(true)
    act(() => result.current.clearSelection())
    expect(result.current.lastSelectedPath).toBeNull()
  })
})
