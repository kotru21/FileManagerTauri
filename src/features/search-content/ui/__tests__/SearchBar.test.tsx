import { act, fireEvent, render, screen } from "@testing-library/react"
import { useNavigationStore } from "@/features/navigation/model/store"
import { useSearchStore } from "@/features/search-content/model/store"

const mockSearchFn = vi.fn()

vi.mock("../../hooks/useSearchWithProgress", () => ({
  useSearchWithProgress: () => ({ search: mockSearchFn }),
}))

// Import component after mocks are set up
import { SearchBar } from "../SearchBar"

function resetStores() {
  act(() => {
    useSearchStore.setState({
      query: "",
      searchPath: "",
      searchContent: false,
      caseSensitive: false,
      isSearching: false,
      results: [],
      progress: null,
      shouldCancel: false,
    })
    useNavigationStore.setState({
      currentPath: null,
      history: [],
      historyIndex: -1,
    })
  })
}

describe("SearchBar", () => {
  beforeEach(() => {
    resetStores()
    mockSearchFn.mockClear()
  })

  it('renders input with placeholder "Поиск файлов..." when currentPath is set', () => {
    act(() => {
      useNavigationStore.setState({ currentPath: "C:\\Users" })
    })

    render(<SearchBar />)

    const input = screen.getByPlaceholderText("Поиск файлов...")
    expect(input).toBeDefined()
  })

  it('renders placeholder "Выберите папку для поиска" when currentPath is null', () => {
    render(<SearchBar />)

    const input = screen.getByPlaceholderText("Выберите папку для поиска")
    expect(input).toBeDefined()
  })

  it("input is disabled when currentPath is null", () => {
    render(<SearchBar />)

    const input = screen.getByPlaceholderText("Выберите папку для поиска")
    expect((input as HTMLInputElement).disabled).toBe(true)
  })

  it("pressing Enter triggers search (calls setQuery + search())", () => {
    act(() => {
      useNavigationStore.setState({ currentPath: "C:\\Users" })
    })

    render(<SearchBar />)

    const input = screen.getByPlaceholderText("Поиск файлов...")
    fireEvent.change(input, { target: { value: "test query" } })
    fireEvent.keyDown(input, { key: "Enter" })

    expect(useSearchStore.getState().query).toBe("test query")
    expect(mockSearchFn).toHaveBeenCalledTimes(1)
  })

  it("pressing Escape clears input and resets store", () => {
    act(() => {
      useNavigationStore.setState({ currentPath: "C:\\Users" })
      useSearchStore.setState({ query: "something" })
    })

    render(<SearchBar />)

    const input = screen.getByPlaceholderText("Поиск файлов...")
    fireEvent.change(input, { target: { value: "test" } })
    fireEvent.keyDown(input, { key: "Escape" })

    expect((input as HTMLInputElement).value).toBe("")
    expect(useSearchStore.getState().query).toBe("")
  })

  it("clear button resets input", () => {
    act(() => {
      useNavigationStore.setState({ currentPath: "C:\\Users" })
    })

    render(<SearchBar />)

    const input = screen.getByPlaceholderText("Поиск файлов...")
    fireEvent.change(input, { target: { value: "some text" } })

    // The clear button (X icon) should appear when there is text and not searching
    // Find the button that is the inline clear button (type="button" inside relative div)
    const buttons = screen.getAllByRole("button")
    // The clear button is the first button-like element that is not the search/toggle buttons
    // It's the <button type="button"> with X icon inside the relative container
    const inlineClearBtn = buttons.find(
      (btn) => btn.getAttribute("type") === "button" && btn.closest(".relative"),
    )
    expect(inlineClearBtn).toBeDefined()
    fireEvent.click(inlineClearBtn!)

    expect((input as HTMLInputElement).value).toBe("")
    expect(useSearchStore.getState().query).toBe("")
  })

  it("content search toggle button toggles searchContent", () => {
    act(() => {
      useNavigationStore.setState({ currentPath: "C:\\Users" })
    })

    render(<SearchBar />)

    // The toggle button has title "Поиск по содержимому (выкл)"
    const toggleBtn = screen.getByTitle("Поиск по содержимому (выкл)")
    expect(toggleBtn.className).not.toContain("bg-primary/20")

    fireEvent.click(toggleBtn)
    expect(useSearchStore.getState().searchContent).toBe(true)

    // After re-render the button should have the active class
    const activeBtn = screen.getByTitle("Поиск по содержимому (вкл)")
    expect(activeBtn.className).toContain("bg-primary/20")
  })

  it("stop button appears during search and calls cancelSearch", () => {
    act(() => {
      useNavigationStore.setState({ currentPath: "C:\\Users" })
      useSearchStore.setState({ isSearching: true })
    })

    render(<SearchBar />)

    const stopBtn = screen.getByTitle("Остановить поиск")
    expect(stopBtn).toBeDefined()

    fireEvent.click(stopBtn)
    expect(useSearchStore.getState().shouldCancel).toBe(true)
    expect(useSearchStore.getState().isSearching).toBe(false)
  })
})
