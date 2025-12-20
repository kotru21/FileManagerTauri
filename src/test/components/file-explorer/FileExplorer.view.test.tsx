import { render } from "@testing-library/react"
import { expect, test, vi } from "vitest"
import type { FileEntry } from "@/shared/api/tauri"
import { FileExplorerView } from "@/widgets/file-explorer/ui/FileExplorer.view"

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

test("shows loading state", () => {
  const { getByText } = render(
    <FileExplorerView
      isLoading={true}
      files={[]}
      processedFilesCount={0}
      selectedPaths={new Set()}
      handlers={handlers}
      viewMode="list"
      showColumnHeadersInSimpleList={false}
      columnWidths={{ size: 200, date: 120, padding: 8 }}
      setColumnWidth={() => {}}
      performanceThreshold={10}
    />,
  )

  expect(getByText("Загрузка...")).toBeDefined()
})

test("renders simple list with a file row", () => {
  const { getByText } = render(
    <FileExplorerView
      isLoading={false}
      files={[file]}
      processedFilesCount={1}
      selectedPaths={new Set()}
      handlers={handlers}
      viewMode="list"
      showColumnHeadersInSimpleList={true}
      columnWidths={{ size: 200, date: 120, padding: 8 }}
      setColumnWidth={() => {}}
      performanceThreshold={10}
    />,
  )

  expect(getByText("file.txt")).toBeDefined()
})
