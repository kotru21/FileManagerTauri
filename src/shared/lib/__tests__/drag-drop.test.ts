import { describe, expect, it, vi } from "vitest"

import {
  createDragData,
  DRAG_DATA_TYPE,
  getDragAction,
  parseDragData,
  setDragImage,
  setDropEffect,
} from "../drag-drop"

class FakeDataTransfer {
  #data = new Map<string, string>()

  dropEffect: DataTransfer["dropEffect"] = "none"

  getData(type: string): string {
    return this.#data.get(type) ?? ""
  }

  setData(type: string, value: string): void {
    this.#data.set(type, value)
  }

  // Used by setDragImage
  setDragImage = vi.fn()
}

describe("shared/lib/drag-drop", () => {
  it("createDragData serializes paths and action", () => {
    const data = createDragData(["/a", "/b"], "copy")
    expect(JSON.parse(data)).toEqual({ paths: ["/a", "/b"], action: "copy" })
  })

  describe("parseDragData", () => {
    it("parses custom DRAG_DATA_TYPE payload", () => {
      const dt = new FakeDataTransfer()
      dt.setData(DRAG_DATA_TYPE, JSON.stringify({ paths: ["/x"], action: "move" }))

      expect(parseDragData(dt as unknown as DataTransfer)).toEqual({
        paths: ["/x"],
        action: "move",
      })
    })

    it("falls back to application/json when custom type is missing", () => {
      const dt = new FakeDataTransfer()
      dt.setData("application/json", JSON.stringify({ paths: ["/x"], action: "copy" }))

      expect(parseDragData(dt as unknown as DataTransfer)).toEqual({
        paths: ["/x"],
        action: "copy",
      })
    })

    it("returns null on invalid JSON", () => {
      const dt = new FakeDataTransfer()
      dt.setData(DRAG_DATA_TYPE, "not-json")

      expect(parseDragData(dt as unknown as DataTransfer)).toBeNull()
    })
  })

  it("getDragAction returns copy when ctrlKey is pressed", () => {
    expect(getDragAction({ ctrlKey: true } as unknown as DragEvent)).toBe("copy")
    expect(getDragAction({ ctrlKey: false } as unknown as DragEvent)).toBe("move")
  })

  it("setDropEffect sets dropEffect based on canDrop and ctrlKey", () => {
    const dt = new FakeDataTransfer()

    setDropEffect({ ctrlKey: true, dataTransfer: dt } as unknown as React.DragEvent, true)
    expect(dt.dropEffect).toBe("copy")

    setDropEffect({ ctrlKey: false, dataTransfer: dt } as unknown as React.DragEvent, true)
    expect(dt.dropEffect).toBe("move")

    setDropEffect({ ctrlKey: true, dataTransfer: dt } as unknown as React.DragEvent, false)
    expect(dt.dropEffect).toBe("none")
  })

  it("setDragImage calls dataTransfer.setDragImage and cleans up element", () => {
    const dt = new FakeDataTransfer()

    const raf = vi.fn((cb: FrameRequestCallback) => {
      cb(0)
      return 0
    })
    vi.stubGlobal("requestAnimationFrame", raf)

    const beforeCount = document.body.childElementCount

    setDragImage({ dataTransfer: dt } as unknown as React.DragEvent, 2)

    expect(dt.setDragImage).toHaveBeenCalledTimes(1)
    expect(document.body.childElementCount).toBe(beforeCount)
  })
})
