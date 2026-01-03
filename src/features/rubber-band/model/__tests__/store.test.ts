import { act } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  elementIntersectsRect,
  getNormalizedRect,
  type SelectionRect,
  useRubberBandStore,
} from "../store"

describe("useRubberBandStore", () => {
  const reset = () => {
    act(() => {
      useRubberBandStore.setState({ isSelecting: false, rect: null })
    })
  }

  it("startSelection begins selection and initializes rect", () => {
    reset()

    act(() => {
      useRubberBandStore.getState().startSelection(10, 20)
    })

    const s = useRubberBandStore.getState()
    expect(s.isSelecting).toBe(true)
    expect(s.rect).toEqual({ startX: 10, startY: 20, endX: 10, endY: 20 })
  })

  it("updateSelection updates end coords when rect exists", () => {
    reset()

    act(() => {
      useRubberBandStore.getState().startSelection(0, 0)
      useRubberBandStore.getState().updateSelection(5, 7)
    })

    expect(useRubberBandStore.getState().rect).toEqual({ startX: 0, startY: 0, endX: 5, endY: 7 })
  })

  it("endSelection returns rect and resets state", () => {
    reset()

    let rect: SelectionRect | null = null
    act(() => {
      useRubberBandStore.getState().startSelection(1, 2)
      useRubberBandStore.getState().updateSelection(3, 4)
      rect = useRubberBandStore.getState().endSelection()
    })

    expect(rect).toEqual({ startX: 1, startY: 2, endX: 3, endY: 4 })
    expect(useRubberBandStore.getState().isSelecting).toBe(false)
    expect(useRubberBandStore.getState().rect).toBeNull()
  })

  it("cancelSelection resets without returning rect", () => {
    reset()

    act(() => {
      useRubberBandStore.getState().startSelection(1, 1)
      useRubberBandStore.getState().cancelSelection()
    })

    expect(useRubberBandStore.getState().isSelecting).toBe(false)
    expect(useRubberBandStore.getState().rect).toBeNull()
  })
})

describe("rubber-band geometry helpers", () => {
  it("getNormalizedRect returns positive width/height and min left/top", () => {
    const n = getNormalizedRect({ startX: 10, startY: 10, endX: 5, endY: 2 })
    expect(n).toEqual({ left: 5, top: 2, width: 5, height: 8 })
  })

  it("elementIntersectsRect returns true when overlapping", () => {
    const container = {
      left: 100,
      top: 100,
      width: 200,
      height: 200,
      right: 300,
      bottom: 300,
    } as DOMRect

    const selection: SelectionRect = { startX: 120, startY: 120, endX: 170, endY: 170 }

    const element = {
      left: 150,
      top: 150,
      width: 10,
      height: 10,
      right: 160,
      bottom: 160,
    } as DOMRect

    expect(elementIntersectsRect(element, selection, container)).toBe(true)
  })

  it("elementIntersectsRect returns false when separated", () => {
    const container = {
      left: 0,
      top: 0,
      width: 200,
      height: 200,
      right: 200,
      bottom: 200,
    } as DOMRect

    const selection: SelectionRect = { startX: 10, startY: 10, endX: 20, endY: 20 }

    const element = {
      left: 100,
      top: 100,
      width: 10,
      height: 10,
      right: 110,
      bottom: 110,
    } as DOMRect

    expect(elementIntersectsRect(element, selection, container)).toBe(false)
  })
})
