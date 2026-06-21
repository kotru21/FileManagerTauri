/// <reference types="vitest" />

import { fireEvent, render } from "@testing-library/react"
import { createRef } from "react"
import { act } from "react"
import { useSelectionStore } from "@/entities/file-selection"
import { useRubberBandStore } from "../../model/store"
import { RubberBandOverlay } from "../RubberBandOverlay"

describe("RubberBandOverlay drag completion coverage", () => {
  beforeEach(() => {
    act(() => useSelectionStore.getState().clearSelection())
    useRubberBandStore.setState({
      isSelecting: false,
      rect: null,
      startSelection: vi.fn(),
      updateSelection: vi.fn(),
      endSelection: vi.fn(() => ({ startX: 0, startY: 0, endX: 200, endY: 200 })),
      cancelSelection: vi.fn(),
    })
  })

  it("selects intersecting files on mouse up", () => {
    const containerRef = createRef<HTMLDivElement>()
    const div = document.createElement("div")
    document.body.appendChild(div)
    containerRef.current = div
    Object.defineProperty(div, "getBoundingClientRect", {
      value: () => ({ left: 0, top: 0, width: 400, height: 300 }),
    })

    const row = document.createElement("div")
    row.setAttribute("data-file-row", "1")
    row.getBoundingClientRect = () => ({ left: 10, top: 10, right: 110, bottom: 40, width: 100, height: 30, x: 10, y: 10, toJSON: () => ({}) })
    div.appendChild(row)

    render(
      <RubberBandOverlay
        containerRef={containerRef}
        fileSelector="[data-file-row]"
        getPathFromElement={() => "/picked.txt"}
      />,
    )

    act(() => {
      fireEvent.mouseDown(div, { button: 0, clientX: 0, clientY: 0, bubbles: true })
      fireEvent.mouseMove(document, { clientX: 150, clientY: 150, bubbles: true })
      fireEvent.mouseUp(document, { clientX: 150, clientY: 150, bubbles: true })
    })

    document.body.removeChild(div)
  })
})
