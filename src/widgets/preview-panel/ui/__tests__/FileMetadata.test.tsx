import { render, screen } from "@testing-library/react"
import type { FileEntry } from "@/shared/api/tauri"
import FileMetadata from "../FileMetadata"

const makeFile = (overrides: Partial<FileEntry> = {}): FileEntry => ({
  name: "readme.txt",
  path: "/home/user/readme.txt",
  is_dir: false,
  is_hidden: false,
  size: 1024,
  modified: 1700000000000,
  created: 1690000000000,
  extension: "txt",
  ...overrides,
})

const makeDir = (overrides: Partial<FileEntry> = {}): FileEntry => ({
  name: "Documents",
  path: "/home/user/Documents",
  is_dir: true,
  is_hidden: false,
  size: 0,
  modified: 1700000000000,
  created: 1690000000000,
  extension: null,
  ...overrides,
})

describe("FileMetadata", () => {
  it("shows 'Папка' for directory type", () => {
    render(<FileMetadata file={makeDir()} />)

    expect(screen.getByText("Папка")).toBeTruthy()
  })

  it("shows extension in uppercase for files", () => {
    render(<FileMetadata file={makeFile({ name: "notes.txt" })} />)

    expect(screen.getByText("TXT")).toBeTruthy()
  })

  it("shows formatted file size", () => {
    render(<FileMetadata file={makeFile({ size: 2048 })} />)

    // formatBytes(2048) should produce "2 KB" or similar
    expect(screen.getByText("Размер:")).toBeTruthy()
    // Size value is rendered next to the label
    const sizeLabel = screen.getByText("Размер:")
    const sizeRow = sizeLabel.closest("div")!
    expect(sizeRow.textContent).toContain("KB")
  })

  it("shows date fields", () => {
    render(<FileMetadata file={makeFile()} />)

    expect(screen.getByText("Изменён:")).toBeTruthy()
    expect(screen.getByText("Создан:")).toBeTruthy()
  })

  it("shows full path", () => {
    render(<FileMetadata file={makeFile({ path: "/home/user/docs/readme.txt" })} />)

    expect(screen.getByText("Путь:")).toBeTruthy()
    expect(screen.getByText("/home/user/docs/readme.txt")).toBeTruthy()
  })
})
