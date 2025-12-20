import * as rtl from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { TooltipProvider } from "@/shared/ui"
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
    const onQuickLook = vi.fn()
    const props = {
      file: baseFile,
      isSelected: false,
      onSelect,
      onOpen,
      onCopy: () => {},
      onCut: () => {},
      onRename: () => {},
      onDelete: () => {},
      onQuickLook,
    }

    const { container } = rtl.render(
      <TooltipProvider>
        <FileRow {...props} />
      </TooltipProvider>,
    )
    const actions = container.querySelector(".mr-2")
    expect(actions).toBeTruthy()
    expect(actions?.classList.contains("opacity-0")).toBe(true)

    const row = container.firstElementChild as Element

    // row should have no-drag applied so it's clickable inside drag regions
    expect(row.classList.contains("no-drag")).toBe(true)
    expect(row.getAttribute("data-testid")).toBe(`file-row-${encodeURIComponent("/file.txt")}`)

    rtl.fireEvent.pointerEnter(row)
    expect(actions?.classList.contains("opacity-100")).toBe(true)

    const btn = actions?.querySelector("button")
    expect(btn).toBeTruthy()
    expect(btn?.classList.contains("no-drag")).toBe(true)

    // There should be no More actions menu/button
    const moreBtn = actions?.querySelector("button[aria-label='More actions']")
    expect(moreBtn).toBeNull()

    // Quick Look button should exist and call handler
    const quickLookBtn = actions?.querySelector("button[aria-label='Quick Look']") as Element
    expect(quickLookBtn).toBeTruthy()
    rtl.fireEvent.click(quickLookBtn)
    expect(onQuickLook).toHaveBeenCalled()

    rtl.fireEvent.pointerLeave(row)
    expect(actions?.classList.contains("opacity-0")).toBe(true)
  })
})
