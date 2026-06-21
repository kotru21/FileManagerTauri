/// <reference types="vitest" />

import { fireEvent, render } from "@testing-library/react"
import { act, createRef } from "react"
import { useRubberBandStore } from "../../model/store"
import { RubberBandOverlay } from "../RubberBandOverlay"

vi.mock("@/entities/file-selection", () => ({
  useSelectionStore: () => ({
    selectFile: vi.fn(),
    clearSelection: vi.fn(),
  }),
}))

describe("RubberBandOverlay interaction coverage", () => {
  beforeEach(() => {
    useRubberBandStore.setState({
      isSelecting: false,
      rect: null,
      startSelection: vi.fn(),
      updateSelection: vi.fn(),
      endSelection: vi.fn(() => ({ startX: 0, startY: 0, endX: 120, endY: 80 })),
      cancelSelection: vi.fn(),
    })
  })

  it("starts rubber band selection on container mousedown", () => {
    const containerRef = createRef<HTMLDivElement>()
    const div = document.createElement("div")
    document.body.appendChild(div)
    containerRef.current = div
    Object.defineProperty(div, "getBoundingClientRect", {
      value: () => ({ left: 0, top: 0, width: 400, height: 300 }),
    })
    div.scrollLeft = 0
    div.scrollTop = 0

    const startSelection = vi.fn()
    useRubberBandStore.setState({ startSelection })

    render(
      <RubberBandOverlay
        containerRef={containerRef}
        fileSelector="[data-file-row]"
        getPathFromElement={() => "C:/a.txt"}
      />,
    )

    act(() => {
      fireEvent.mouseDown(div, { button: 0, clientX: 10, clientY: 10, bubbles: true })
    })
    expect(startSelection).toHaveBeenCalled()

    document.body.removeChild(div)
  })

  it("cancels selection on Escape key", () => {
    const containerRef = createRef<HTMLDivElement>()
    const div = document.createElement("div")
    containerRef.current = div

    const cancelSelection = vi.fn()
    useRubberBandStore.setState({
      isSelecting: true,
      rect: { startX: 0, startY: 0, endX: 50, endY: 50 },
      cancelSelection,
    })

    render(
      <RubberBandOverlay
        containerRef={containerRef}
        fileSelector="[data-file-row]"
        getPathFromElement={() => null}
      />,
    )

    act(() => {
      fireEvent.mouseDown(div, { button: 0, clientX: 0, clientY: 0, bubbles: true })
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))
    })
    expect(cancelSelection).toHaveBeenCalled()
  })
})
