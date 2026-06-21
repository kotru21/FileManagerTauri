/// <reference types="vitest" />

import "@testing-library/jest-dom/vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { act } from "react"
import { beforeAll } from "vitest"
import { useInlineEditStore } from "@/features/inline-edit"
import type { FileEntry } from "@/shared/api/tauri"
import { FileExplorerGrid } from "../FileExplorerGrid"

beforeAll(() => {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = ResizeObserverMock as typeof ResizeObserver
})

const file: FileEntry = {
  path: "/x.txt",
  name: "x.txt",
  is_dir: false,
  size: 1,
  modified: 1,
  created: null,
  is_hidden: false,
  extension: "txt",
}

const handlers = {
  handleSelect: vi.fn(),
  handleOpen: vi.fn(),
  handleDrop: vi.fn(),
  handleCreateFolder: vi.fn(),
  handleCreateFile: vi.fn(),
  handleRename: vi.fn(),
  handleCopy: vi.fn(),
  handleCut: vi.fn(),
  handlePaste: vi.fn(),
  handleDelete: vi.fn(),
  handleStartNewFolder: vi.fn(),
  handleStartNewFile: vi.fn(),
  handleStartRenameAt: vi.fn(),
}

describe("FileExplorerGrid coverage", () => {
  beforeEach(() => {
    act(() => useInlineEditStore.getState().reset())
  })

  it("renders grid and inline create row", () => {
    act(() => useInlineEditStore.setState({ mode: "new-folder", parentPath: "/", targetPath: null }))
    render(
      <FileExplorerGrid className="grid-test" files={[file]} selectedPaths={new Set()} handlers={handlers} />,
    )

    const input = screen.getByPlaceholderText("Имя папки...")
    fireEvent.change(input, { target: { value: "newfolder" } })
    fireEvent.keyDown(input, { key: "Enter" })
    expect(handlers.handleCreateFolder).toHaveBeenCalledWith("newfolder")
  })
})
