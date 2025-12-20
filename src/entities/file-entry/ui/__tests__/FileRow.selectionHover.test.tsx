import { fireEvent, render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
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

describe("FileRow selection + hover", () => {
  it("keeps selection visual when hovered", () => {
    const onSelect = () => {}
    const onOpen = () => {}

    const { container } = render(
      <FileRow file={baseFile} isSelected={true} onSelect={onSelect} onOpen={onOpen} />,
    )

    const row = container.firstElementChild as Element
    expect(row).toBeTruthy()

    // Initially selected
    expect(row.classList.contains("bg-accent")).toBe(true)

    // Hover
    fireEvent.pointerEnter(row)

    // Still selected visually
    expect(row.classList.contains("bg-accent")).toBe(true)

    // Leave
    fireEvent.pointerLeave(row)
    expect(row.classList.contains("bg-accent")).toBe(true)
  })
})
