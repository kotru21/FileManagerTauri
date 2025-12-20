import { render } from "@testing-library/react"
import { expect, test, vi } from "vitest"
import type { FileDisplaySettings } from "@/features/settings"
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

  // dispatchEvent returns false if preventDefault was called
  expect(prevented).toBe(true)
  expect(onSelect).toHaveBeenCalled()
})

test("scrollIntoView uses smooth by default and auto when reducedMotion", () => {
  // Provide a shim for scrollIntoView in JSDOM if missing
  type ScrollIntoViewFn = (options?: ScrollIntoViewOptions | boolean) => void
  const proto = Element.prototype as unknown as { scrollIntoView?: ScrollIntoViewFn }
  const original = proto.scrollIntoView
  const scrollSpy = vi.fn()
  Object.defineProperty(Element.prototype, "scrollIntoView", {
    configurable: true,
    value: scrollSpy,
  })

  try {
    // default (reducedMotion=false)
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

    // Rerender with reduced motion enabled
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
    // restore original if existed
    if (original === undefined) delete proto.scrollIntoView
    else
      Object.defineProperty(Element.prototype, "scrollIntoView", {
        configurable: true,
        value: original,
      })
  }
})
