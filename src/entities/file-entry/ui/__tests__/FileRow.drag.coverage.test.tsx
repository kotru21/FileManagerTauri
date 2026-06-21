/// <reference types="vitest" />

import "@testing-library/jest-dom/vitest"
import { fireEvent, render } from "@testing-library/react"
import { createDragData } from "@/shared/lib/drag-drop"
import { FileRow } from "../FileRow"

const dirFile = {
  path: "/tmp/folder",
  name: "folder",
  is_dir: true,
  is_hidden: false,
  extension: null,
  size: 0,
  modified: Math.floor(Date.now() / 1000),
  created: null,
}

const regularFile = {
  ...dirFile,
  path: "/tmp/readme.md",
  name: "readme.md",
  is_dir: false,
  extension: "md",
  size: 42,
}

describe("FileRow drag and drop branches", () => {
  it("ignores dragOver on files (non-directories)", () => {
    const { getByRole } = render(
      <FileRow file={regularFile} isSelected={false} onSelect={() => {}} onOpen={() => {}} />,
    )
    const row = getByRole("option")
    const preventDefault = vi.fn()
    fireEvent.dragOver(row, {
      preventDefault,
      dataTransfer: { dropEffect: "none", ctrlKey: false },
    })
    expect(preventDefault).not.toHaveBeenCalled()
  })

  it("handles dragOver on directory with move and copy drop effects", () => {
    const { getByRole } = render(
      <FileRow file={dirFile} isSelected={false} onSelect={() => {}} onOpen={() => {}} />,
    )
    const row = getByRole("option")

    fireEvent.dragOver(row, {
      preventDefault: vi.fn(),
      dataTransfer: { dropEffect: "none" },
      ctrlKey: false,
    })
    expect(row.className).toContain("ring-primary")

    fireEvent.dragLeave(row)
    expect(row.className).not.toContain("bg-accent/70")

    fireEvent.dragOver(row, {
      preventDefault: vi.fn(),
      dataTransfer: { dropEffect: "none" },
      ctrlKey: true,
    })
    expect(row.className).toContain("ring-primary")
  })

  it("drops parsed paths onto directory and calls onDrop", () => {
    const onDrop = vi.fn()
    const payload = createDragData(["/tmp/a.txt"], "move")
    const { getByRole } = render(
      <FileRow
        file={dirFile}
        isSelected={false}
        onSelect={() => {}}
        onOpen={() => {}}
        onDrop={onDrop}
      />,
    )
    const row = getByRole("option")

    fireEvent.drop(row, {
      preventDefault: vi.fn(),
      dataTransfer: {
        getData: (type: string) => (type === "application/x-file-manager-paths" ? payload : ""),
      },
    })

    expect(onDrop).toHaveBeenCalledWith(["/tmp/a.txt"], dirFile.path)
  })

  it("drop on directory without onDrop handler is a no-op", () => {
    const { getByRole } = render(
      <FileRow file={dirFile} isSelected={false} onSelect={() => {}} onOpen={() => {}} />,
    )
    const row = getByRole("option")
    expect(() =>
      fireEvent.drop(row, {
        preventDefault: vi.fn(),
        dataTransfer: { getData: () => createDragData(["/x"]) },
      }),
    ).not.toThrow()
  })

  it("strips extension from display name when hidden and shows dir name as-is", () => {
    const { getByText, rerender } = render(
      <FileRow
        file={regularFile}
        isSelected={false}
        onSelect={() => {}}
        onOpen={() => {}}
        displaySettings={{
          showFileExtensions: false,
          showFileSizes: false,
          showFileDates: false,
          dateFormat: "relative",
          thumbnailSize: "medium",
        }}
      />,
    )
    expect(getByText("readme")).toBeInTheDocument()

    rerender(
      <FileRow
        file={dirFile}
        isSelected={false}
        onSelect={() => {}}
        onOpen={() => {}}
        displaySettings={{
          showFileExtensions: false,
          showFileSizes: false,
          showFileDates: false,
          dateFormat: "relative",
          thumbnailSize: "medium",
        }}
      />,
    )
    expect(getByText("folder")).toBeInTheDocument()
  })

  it("uses selected styling for size and date columns", () => {
    const { container } = render(
      <FileRow
        file={regularFile}
        isSelected={true}
        onSelect={() => {}}
        onOpen={() => {}}
        displaySettings={{
          showFileExtensions: true,
          showFileSizes: true,
          showFileDates: true,
          dateFormat: "relative",
          thumbnailSize: "small",
        }}
      />,
    )
    const muted = container.querySelector(".text-accent-foreground-muted")
    expect(muted).toBeTruthy()
  })

  it("starts drag with selected paths from getter", () => {
    const setData = vi.fn()
    const setDragImage = vi.fn()
    const { getByRole } = render(
      <FileRow
        file={regularFile}
        isSelected={true}
        onSelect={() => {}}
        onOpen={() => {}}
        getSelectedPaths={() => ["/tmp/a.txt", "/tmp/b.txt"]}
      />,
    )
    fireEvent.dragStart(getByRole("option"), {
      dataTransfer: { setData, setDragImage, effectAllowed: "" },
      ctrlKey: false,
      altKey: false,
    })
    expect(setData).toHaveBeenCalled()
  })
})
