import { render } from "@testing-library/react"
import { expect, test, vi } from "vitest"
import type { FileEntry } from "@/shared/api/tauri"

// Mock the heavy FileGrid implementation
vi.mock("@/widgets/file-explorer/ui/FileGrid", () => ({
  FileGrid: () => <div data-testid="mock-file-grid">MockGrid</div>,
}))

import { FileExplorerGrid } from "@/widgets/file-explorer/ui/FileExplorerGrid"

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

test("renders the mocked FileGrid", () => {
  const { getByTestId } = render(
    <FileExplorerGrid
      className="test"
      files={[file]}
      selectedPaths={new Set()}
      handlers={handlers}
    />,
  )

  expect(getByTestId("mock-file-grid")).toBeDefined()
})
