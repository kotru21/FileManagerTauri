import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { FileEntry } from "@/shared/api/tauri"
import type { UseFolderPreviewReturn } from "../../lib/useFolderPreview"
import FolderPreview from "../FolderPreview"

const file: FileEntry = {
  name: "Projects",
  path: "C:/Users/Test/Projects",
  is_dir: true,
  is_hidden: false,
  size: 0,
  modified: null,
  created: null,
  extension: null,
}

const hook: UseFolderPreviewReturn = {
  entries: [],
  currentPath: "C:/Users/Test/Projects",
  isLoadingEntries: false,
  error: null,
  handleEnterFolder: vi.fn(),
  handleShowFile: vi.fn(),
  handleToggleUp: vi.fn(),
  handleOpenExternal: vi.fn(),
  pathStack: ["C:/Users/Test/Projects"],
}

describe("FolderPreview", () => {
  it("renders folder name and path", () => {
    render(<FolderPreview file={file} hook={hook} />)
    expect(screen.getByText("Projects")).toBeTruthy()
    expect(screen.getByText("C:/Users/Test/Projects")).toBeTruthy()
  })
})
