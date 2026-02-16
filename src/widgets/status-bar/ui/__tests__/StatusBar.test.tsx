import { act, render, screen } from "@testing-library/react"
import { useDirectoryContents } from "@/entities/file-entry"
import { useClipboardStore } from "@/features/clipboard/model/store"
import { useSelectionStore } from "@/features/file-selection/model/store"
import { useNavigationStore } from "@/features/navigation/model/store"
import { useQuickFilterStore } from "@/features/quick-filter/model/store"
import { useSearchStore } from "@/features/search-content/model/store"
import type { SearchResult } from "@/shared/api/tauri"
import { StatusBar } from "../StatusBar"

vi.mock("@/entities/file-entry", () => ({
  useDirectoryContents: vi.fn(() => ({
    data: [],
    isLoading: false,
    isFetching: false,
  })),
}))

const mockUseDirectoryContents = useDirectoryContents as ReturnType<typeof vi.fn>

describe("StatusBar", () => {
  beforeEach(() => {
    act(() => {
      useNavigationStore.setState({
        currentPath: "C:/Users/Documents",
        history: [],
        historyIndex: -1,
      })
      useSelectionStore.setState({
        selectedPaths: new Set(),
        lastSelectedPath: null,
        _cachedPaths: [],
        _cacheValid: false,
      })
      useClipboardStore.setState({
        paths: [],
        action: null,
      })
      useQuickFilterStore.setState({
        filter: "",
        isActive: false,
      })
      useSearchStore.setState({
        isSearching: false,
        results: [],
      })
    })

    mockUseDirectoryContents.mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
    })
  })

  it("shows folder count and file count from directory contents", () => {
    mockUseDirectoryContents.mockReturnValue({
      data: [
        { name: "folder1", path: "C:/folder1", is_dir: true, size: 0 },
        { name: "folder2", path: "C:/folder2", is_dir: true, size: 0 },
        { name: "file1.txt", path: "C:/file1.txt", is_dir: false, size: 100 },
        { name: "file2.txt", path: "C:/file2.txt", is_dir: false, size: 200 },
        { name: "file3.txt", path: "C:/file3.txt", is_dir: false, size: 300 },
      ],
      isLoading: false,
      isFetching: false,
    })

    render(<StatusBar />)

    // 2 folders and 3 files
    expect(screen.getByText("2")).toBeDefined()
    expect(screen.getByText("3")).toBeDefined()
  })

  it("shows loading text when isLoading", () => {
    mockUseDirectoryContents.mockReturnValue({
      data: [],
      isLoading: true,
      isFetching: false,
    })

    render(<StatusBar />)

    expect(screen.getByText("Загрузка...")).toBeDefined()
  })

  it("shows searching text when isSearching", () => {
    act(() => {
      useSearchStore.setState({ isSearching: true, results: [] })
    })

    mockUseDirectoryContents.mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
    })

    render(<StatusBar />)

    expect(screen.getByText("Поиск...")).toBeDefined()
  })

  it("shows search results count", () => {
    act(() => {
      useSearchStore.setState({
        isSearching: false,
        results: [
          { path: "C:/a.txt", name: "a.txt", is_dir: false },
          { path: "C:/b.txt", name: "b.txt", is_dir: false },
          { path: "C:/c.txt", name: "c.txt", is_dir: false },
        ] as unknown as SearchResult[],
      })
    })

    render(<StatusBar />)

    expect(screen.getByText("Найдено: 3 результат(ов)")).toBeDefined()
  })

  it("shows selection count when files selected", () => {
    mockUseDirectoryContents.mockReturnValue({
      data: [
        { name: "file1.txt", path: "C:/file1.txt", is_dir: false, size: 100 },
        { name: "file2.txt", path: "C:/file2.txt", is_dir: false, size: 200 },
      ],
      isLoading: false,
      isFetching: false,
    })

    act(() => {
      useSelectionStore.setState({
        selectedPaths: new Set(["C:/file1.txt", "C:/file2.txt"]),
        _cacheValid: false,
      })
    })

    render(<StatusBar />)

    expect(screen.getByText(/Выбрано: 2/)).toBeDefined()
  })

  it("shows clipboard indicator", () => {
    act(() => {
      useClipboardStore.setState({
        paths: ["C:/a.txt", "C:/b.txt", "C:/c.txt"],
        action: "copy",
      })
    })

    render(<StatusBar />)

    expect(screen.getByText(/Скопировано: 3/)).toBeDefined()
  })

  it("shows current path with truncate", () => {
    render(<StatusBar />)

    const pathElement = screen.getByText("C:/Users/Documents")
    expect(pathElement).toBeDefined()
    expect(pathElement.className).toContain("truncate")
  })
})
