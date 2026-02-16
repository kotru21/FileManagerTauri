import { act, fireEvent, render, screen } from "@testing-library/react"
import { useCommandPaletteStore } from "@/features/command-palette/model/store"

// jsdom does not implement scrollIntoView
Element.prototype.scrollIntoView = vi.fn()

const mockAction1 = vi.fn()
const mockAction2 = vi.fn()
const mockAction3 = vi.fn()

function resetStore() {
  act(() => {
    useCommandPaletteStore.setState({
      isOpen: false,
      search: "",
      selectedIndex: 0,
      commands: [],
    })
  })
}

function openWithCommands() {
  act(() => {
    useCommandPaletteStore.setState({
      isOpen: true,
      search: "",
      selectedIndex: 0,
      commands: [
        {
          id: "cmd1",
          title: "Назад",
          category: "navigation",
          action: mockAction1,
          icon: "arrow-left",
        },
        { id: "cmd2", title: "Копировать", category: "edit", action: mockAction2, icon: "copy" },
        {
          id: "cmd3",
          title: "Поиск файлов",
          category: "search",
          action: mockAction3,
          icon: "search",
        },
      ],
    })
  })
}

// Import after mocks
import { CommandPalette } from "../CommandPalette"

describe("CommandPalette", () => {
  beforeEach(() => {
    resetStore()
    mockAction1.mockClear()
    mockAction2.mockClear()
    mockAction3.mockClear()
  })

  it("is not rendered when isOpen=false", () => {
    render(<CommandPalette />)

    // Dialog should not be visible
    const input = screen.queryByPlaceholderText("Введите команду...")
    expect(input).toBeNull()
  })

  it('shows "Введите команду..." placeholder when open', () => {
    openWithCommands()
    render(<CommandPalette />)

    const input = screen.getByPlaceholderText("Введите команду...")
    expect(input).toBeDefined()
  })

  it("shows registered commands grouped by category", () => {
    openWithCommands()
    render(<CommandPalette />)

    // Category labels should be present
    expect(screen.getByText("Навигация")).toBeDefined()
    expect(screen.getByText("Редактирование")).toBeDefined()
    expect(screen.getByText("Поиск")).toBeDefined()

    // Command titles should be present
    expect(screen.getByText("Назад")).toBeDefined()
    expect(screen.getByText("Копировать")).toBeDefined()
    expect(screen.getByText("Поиск файлов")).toBeDefined()
  })

  it("typing filters commands by title", () => {
    openWithCommands()
    render(<CommandPalette />)

    const input = screen.getByPlaceholderText("Введите команду...")

    // Type a filter that only matches "Копировать"
    fireEvent.change(input, { target: { value: "Копир" } })

    // "Копировать" should still be visible
    expect(screen.getByText("Копировать")).toBeDefined()

    // "Назад" and "Поиск файлов" should not be visible
    expect(screen.queryByText("Назад")).toBeNull()
    expect(screen.queryByText("Поиск файлов")).toBeNull()
  })

  it("ArrowDown changes selectedIndex", () => {
    openWithCommands()
    render(<CommandPalette />)

    const input = screen.getByPlaceholderText("Введите команду...")

    expect(useCommandPaletteStore.getState().selectedIndex).toBe(0)

    fireEvent.keyDown(input, { key: "ArrowDown" })
    expect(useCommandPaletteStore.getState().selectedIndex).toBe(1)

    fireEvent.keyDown(input, { key: "ArrowDown" })
    expect(useCommandPaletteStore.getState().selectedIndex).toBe(2)
  })

  it("Enter executes the selected command", () => {
    openWithCommands()
    render(<CommandPalette />)

    const input = screen.getByPlaceholderText("Введите команду...")

    // selectedIndex is 0 => first command is "Назад" (navigation category comes first)
    fireEvent.keyDown(input, { key: "Enter" })

    expect(mockAction1).toHaveBeenCalledTimes(1)
    // Palette should close after execution
    expect(useCommandPaletteStore.getState().isOpen).toBe(false)
  })

  it("Escape closes palette", () => {
    openWithCommands()
    render(<CommandPalette />)

    const input = screen.getByPlaceholderText("Введите команду...")

    fireEvent.keyDown(input, { key: "Escape" })
    expect(useCommandPaletteStore.getState().isOpen).toBe(false)
  })
})
