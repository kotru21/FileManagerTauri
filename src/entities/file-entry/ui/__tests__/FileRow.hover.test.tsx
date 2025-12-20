import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { FileRow } from "../FileRow"

const baseFile = {
  name: "file.txt",
  path: "/file.txt",
  is_dir: false,
  is_hidden: false,
  size: 1024,
  modified: Date.now(),
  created: Date.now(),
  extension: "txt",
}

describe("FileRow hover behavior", () => {
  it("shows actions on pointerEnter and hides on pointerLeave", async () => {
    const onSelect = vi.fn()
    const onOpen = vi.fn()
    const props = {
      file: baseFile,
      isSelected: false,
      onSelect,
      onOpen,
      onCopy: () => {},
      onCut: () => {},
      onRename: () => {},
      onDelete: () => {},
    }

    const { container } = render(<FileRow {...props} />)
    // Initially actions should be hidden (opacity-0)
    const actions = container.querySelector(".mr-2")
    expect(actions).toBeTruthy()
    expect(actions?.classList.contains("opacity-0")).toBe(true)

    const row = container.firstElementChild as Element

    // row should have no-drag applied so it's clickable inside drag regions
    expect(row.classList.contains("no-drag")).toBe(true)
    expect(row.getAttribute("data-testid")).toBe(`file-row-${encodeURIComponent("/file.txt")}`)

    fireEvent.pointerEnter(row)
    // After pointerEnter we should see opacity-100
    expect(actions?.classList.contains("opacity-100")).toBe(true)

    // Buttons inside actions should also be no-drag so clicks work
    const btn = actions?.querySelector("button")
    expect(btn).toBeTruthy()
    expect(btn?.classList.contains("no-drag")).toBe(true)

    // Click the More actions button and ensure dropdown opens
    const moreBtn = actions?.querySelector("button[aria-label='More actions']") as Element
    expect(moreBtn).toBeTruthy()
    // Use pointerDown/pointerUp to better emulate how Radix triggers menus
    fireEvent.pointerDown(moreBtn)
    fireEvent.pointerUp(moreBtn)

    // Dropdown content should be visible (Open menu item)
    await screen.findByText("Open")
    expect(screen.getByText("Open")).toBeTruthy()

    fireEvent.pointerLeave(row)
    expect(actions?.classList.contains("opacity-0")).toBe(true)
  })
})
