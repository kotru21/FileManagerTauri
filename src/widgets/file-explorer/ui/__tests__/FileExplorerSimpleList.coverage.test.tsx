/// <reference types="vitest" />

import "@testing-library/jest-dom/vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { act } from "react"
import { useInlineEditStore } from "@/features/inline-edit"
import type { FileEntry } from "@/shared/api/tauri"
import { FileExplorerSimpleList } from "../FileExplorerSimpleList"

const file: FileEntry = {
  path: "/list.txt",
  name: "list.txt",
  is_dir: false,
  size: 3,
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

describe("FileExplorerSimpleList coverage", () => {
  beforeEach(() => {
    act(() => useInlineEditStore.getState().reset())
  })

  it("renders rows with column header and inline rename", () => {
    act(() => useInlineEditStore.setState({ mode: "rename", targetPath: "/list.txt", parentPath: null }))

    render(
      <FileExplorerSimpleList
        files={[file]}
        selectedPaths={new Set(["/list.txt"])}
        handlers={handlers}
        showColumnHeadersInSimpleList
        columnWidths={{ size: 90, date: 140, padding: 16 }}
        setColumnWidth={vi.fn()}
        sortConfig={{ field: "name", direction: "asc" }}
        onSort={vi.fn()}
        displaySettings={{
          showHiddenFiles: false,
          showFileSizes: true,
          showFileDates: true,
          thumbnailSize: "medium",
        }}
        appearanceLocal={{
          theme: "system",
          fontSize: "medium",
          accentColor: "#3b82f6",
          compactDensity: false,
          animationsEnabled: true,
        }}
      />,
    )

    expect(screen.getByDisplayValue("list.txt")).toBeInTheDocument()
    expect(screen.getByRole("listbox")).toBeInTheDocument()
  })

  it("shows inline new folder row when list is empty", () => {
    act(() => useInlineEditStore.setState({ mode: "new-folder", parentPath: "/", targetPath: null }))

    render(
      <FileExplorerSimpleList
        files={[]}
        selectedPaths={new Set()}
        handlers={handlers}
        showColumnHeadersInSimpleList={false}
        columnWidths={{ size: 90, date: 140, padding: 16 }}
        setColumnWidth={vi.fn()}
        displaySettings={{
          showHiddenFiles: false,
          showFileSizes: true,
          showFileDates: true,
          thumbnailSize: "medium",
        }}
        appearanceLocal={{
          theme: "system",
          fontSize: "medium",
          accentColor: "#3b82f6",
          compactDensity: false,
          animationsEnabled: true,
        }}
      />,
    )

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "newfolder" } })
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" })
    expect(handlers.handleCreateFolder).toHaveBeenCalledWith("newfolder")
  })
})
