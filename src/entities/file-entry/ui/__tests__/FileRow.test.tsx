import { render } from "@testing-library/react"
import { expect, test, vi } from "vitest"
import type { FileEntry } from "@/shared/api/tauri"
import { FileRow } from "../FileRow"

const file: FileEntry = {
  path: "/tmp/file.txt",
  name: "file.txt",
  is_dir: false,
  is_hidden: false,
  extension: "txt",
  size: 100,
  modified: Date.now(),
  created: null,
}

test("right-click selects item and doesn't prevent default", () => {
  const onSelect = vi.fn()
  const onOpen = vi.fn()
  const { getByText } = render(
    <FileRow file={file} isSelected={false} onSelect={onSelect} onOpen={onOpen} />,
  )

  const node = getByText("file.txt")

  const event = new MouseEvent("contextmenu", { bubbles: true, cancelable: true, button: 2 })
  const prevented = node.dispatchEvent(event)

  // dispatchEvent returns false if preventDefault was called
  expect(prevented).toBe(true)
  expect(onSelect).toHaveBeenCalled()
})
