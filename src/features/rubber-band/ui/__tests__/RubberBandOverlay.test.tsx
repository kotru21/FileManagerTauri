import { render } from "@testing-library/react"
import { createRef } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useRubberBandStore } from "../../model/store"
import { RubberBandOverlay } from "../RubberBandOverlay"

vi.mock("@/features/file-selection", () => ({
  useSelectionStore: () => ({
    selectFile: vi.fn(),
    clearSelection: vi.fn(),
  }),
}))

describe("RubberBandOverlay", () => {
  beforeEach(() => {
    useRubberBandStore.setState({
      isSelecting: false,
      rect: null,
      startSelection: vi.fn(),
      updateSelection: vi.fn(),
      endSelection: vi.fn(),
      cancelSelection: vi.fn(),
    })
  })

  it("renders selection rectangle when selecting", () => {
    const containerRef = createRef<HTMLDivElement>()
    const div = document.createElement("div")
    containerRef.current = div
    useRubberBandStore.setState({
      isSelecting: true,
      rect: { startX: 10, startY: 20, endX: 110, endY: 70 },
    })
    const { container } = render(
      <RubberBandOverlay
        containerRef={containerRef}
        fileSelector="[data-file-row]"
        getPathFromElement={() => "C:/test/a.txt"}
      />,
    )
    const band = container.querySelector("[data-rubber-band]")
    expect(band).toBeTruthy()
  })
})
