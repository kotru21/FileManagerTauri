/// <reference types="vitest" />

import "@testing-library/jest-dom/vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import type { FileEntry } from "@/shared/api/tauri"
import { FileCard } from "../FileCard"

const file: FileEntry = {
  path: "/docs/readme.md",
  name: "readme.md",
  is_dir: false,
  is_hidden: false,
  extension: "md",
  size: 42,
  modified: 100,
  created: null,
}

describe("FileCard coverage", () => {
  it("handles select, open, and selected styling", () => {
    const onSelect = vi.fn()
    const onOpen = vi.fn()

    const { rerender } = render(
      <FileCard file={file} isSelected={false} onSelect={onSelect} onOpen={onOpen} />,
    )

    fireEvent.click(screen.getByText("readme.md"))
    fireEvent.doubleClick(screen.getByText("readme.md"))
    expect(onSelect).toHaveBeenCalled()
    expect(onOpen).toHaveBeenCalled()

    rerender(<FileCard file={file} isSelected onSelect={onSelect} onOpen={onOpen} />)
    expect(screen.getByText("readme.md").closest("div")).toHaveClass("bg-accent")
  })
})
