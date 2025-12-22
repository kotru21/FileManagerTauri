import { act, fireEvent, render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { useSelectionStore } from "@/features/file-selection"

function TestBackground() {
  const clearSelection = useSelectionStore((s) => s.clearSelection)
  return (
    <div
      data-testid="bg"
      onPointerDown={(e: React.PointerEvent) => {
        const ev = e as React.PointerEvent
        if (ev.button !== 0) return
        if (ev.target !== ev.currentTarget) return
        clearSelection()
      }}
    >
      <div data-testid="child">child</div>
    </div>
  )
}

describe("selection clearing behavior", () => {
  it("clears selection on primary pointerdown on background", () => {
    act(() => {
      useSelectionStore.getState().clearSelection()
      useSelectionStore.getState().selectFile("/file1.txt")
    })

    const { getByTestId } = render(<TestBackground />)
    const bg = getByTestId("bg")

    // Sanity: selection set
    expect(Array.from(useSelectionStore.getState().selectedPaths)).toEqual(["/file1.txt"])

    fireEvent.pointerDown(bg, { button: 0 })

    expect(Array.from(useSelectionStore.getState().selectedPaths)).toEqual([])
  })

  it("does not clear selection on non-primary button (right-click)", () => {
    act(() => {
      useSelectionStore.getState().clearSelection()
      useSelectionStore.getState().selectFile("/file1.txt")
    })

    const { getByTestId } = render(<TestBackground />)
    const bg = getByTestId("bg")

    fireEvent.pointerDown(bg, { button: 2 })

    expect(Array.from(useSelectionStore.getState().selectedPaths)).toEqual(["/file1.txt"])
  })

  it("does not clear selection when pointerdown occurs on a child element", () => {
    act(() => {
      useSelectionStore.getState().clearSelection()
      useSelectionStore.getState().selectFile("/file1.txt")
    })

    const { getByTestId } = render(<TestBackground />)
    const child = getByTestId("child")

    fireEvent.pointerDown(child, { button: 0 })

    expect(Array.from(useSelectionStore.getState().selectedPaths)).toEqual(["/file1.txt"])
  })
})
