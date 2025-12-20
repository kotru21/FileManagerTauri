import { render } from "@testing-library/react"
import { expect, test, vi } from "vitest"

// Minimal FileDisplaySettings for unit tests
type FileDisplaySettings = {
  showFileExtensions: boolean
  showFileSizes: boolean
  showFileDates: boolean
  showHiddenFiles: boolean
  dateFormat: "relative" | "absolute"
  thumbnailSize: "small" | "medium" | "large"
}

// Minimal FileEntry for unit tests
type FileEntry = {
  path: string
  name: string
  is_dir: boolean
  is_hidden: boolean
  extension: string | null
  size: number
  modified: number | null
  created: number | null
}

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

const defaultDisplay: FileDisplaySettings = {
  showFileExtensions: true,
  showFileSizes: true,
  showFileDates: true,
  showHiddenFiles: false,
  dateFormat: "relative",
  thumbnailSize: "medium",
}

const defaultAppearance = { reducedMotion: false }

test("right-click selects item and doesn't prevent default", () => {
  const onSelect = vi.fn()
  const onOpen = vi.fn()
  const { getByText } = render(
    <FileRow
      file={file}
      isSelected={false}
      onSelect={onSelect}
      onOpen={onOpen}
      displaySettings={defaultDisplay}
      appearance={defaultAppearance}
    />,
  )

  const node = getByText("file.txt")

  const event = new MouseEvent("contextmenu", { bubbles: true, cancelable: true, button: 2 })
  const prevented = node.dispatchEvent(event)

  expect(prevented).toBe(true)
  expect(onSelect).toHaveBeenCalled()
})

test("scrollIntoView uses smooth by default and auto when reducedMotion", () => {
  type ScrollIntoViewFn = (options?: ScrollIntoViewOptions | boolean) => void
  const proto = Element.prototype as unknown as { scrollIntoView?: ScrollIntoViewFn }
  const original = proto.scrollIntoView
  const scrollSpy = vi.fn()
  Object.defineProperty(Element.prototype, "scrollIntoView", {
    configurable: true,
    value: scrollSpy,
  })

  try {
    const { rerender } = render(
      <FileRow
        file={file}
        isSelected={false}
        isFocused={true}
        onSelect={() => {}}
        onOpen={() => {}}
        displaySettings={defaultDisplay}
        appearance={defaultAppearance}
      />,
    )

    expect(scrollSpy).toHaveBeenCalled()
    const lastCall = scrollSpy.mock.calls[scrollSpy.mock.calls.length - 1] as unknown[] | undefined
    const lastArg = lastCall ? (lastCall[0] as ScrollIntoViewOptions) : undefined
    expect(lastArg?.behavior).toBe("smooth")

    rerender(
      <FileRow
        file={file}
        isSelected={false}
        isFocused={true}
        onSelect={() => {}}
        onOpen={() => {}}
        displaySettings={defaultDisplay}
        appearance={{ reducedMotion: true }}
      />,
    )

    const lastCall2 = scrollSpy.mock.calls[scrollSpy.mock.calls.length - 1] as unknown[] | undefined
    const lastArg2 = lastCall2 ? (lastCall2[0] as ScrollIntoViewOptions) : undefined
    expect(lastArg2?.behavior).toBe("auto")
  } finally {
    if (original === undefined) delete proto.scrollIntoView
    else
      Object.defineProperty(Element.prototype, "scrollIntoView", {
        configurable: true,
        value: original,
      })
  }
})
