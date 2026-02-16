import { act, fireEvent, render, screen } from "@testing-library/react"
import { useQuickFilterStore } from "../../model/store"
import { QuickFilterBar } from "../QuickFilterBar"

vi.mock("@/entities/app-settings", () => ({
  usePerformanceSettings: () => ({ debounceDelay: 100 }),
}))

describe("QuickFilterBar", () => {
  beforeEach(() => {
    act(() => {
      useQuickFilterStore.setState({
        filter: "",
        isActive: true,
      })
    })
  })

  it("renders input with placeholder", () => {
    render(<QuickFilterBar totalCount={10} filteredCount={5} />)

    const input = screen.getByPlaceholderText("Фильтр по имени...")
    expect(input).toBeDefined()
  })

  it("shows count from filteredCount/totalCount props", () => {
    render(<QuickFilterBar totalCount={10} filteredCount={5} />)

    expect(screen.getByText("5 / 10")).toBeDefined()
  })

  it("pressing Escape calls deactivate", () => {
    const deactivate = vi.fn()
    act(() => {
      useQuickFilterStore.setState({ deactivate })
    })

    render(<QuickFilterBar totalCount={10} filteredCount={10} />)

    const input = screen.getByPlaceholderText("Фильтр по имени...")
    fireEvent.keyDown(input, { key: "Escape" })

    expect(deactivate).toHaveBeenCalled()
  })

  it("clear button appears when filter non-empty and clears on click", () => {
    const setFilter = vi.fn()
    act(() => {
      useQuickFilterStore.setState({ filter: "test", setFilter })
    })

    render(<QuickFilterBar totalCount={10} filteredCount={3} />)

    // There should be two X buttons: the clear button and the close button.
    // When filter is non-empty, the clear button appears first.
    const buttons = screen.getAllByRole("button")
    // The first button with X icon is the clear button
    const clearButton = buttons[0]
    fireEvent.click(clearButton)

    expect(setFilter).toHaveBeenCalledWith("")
  })

  it("close button always visible and calls deactivate", () => {
    const deactivate = vi.fn()
    act(() => {
      useQuickFilterStore.setState({ filter: "", deactivate })
    })

    render(<QuickFilterBar totalCount={10} filteredCount={10} />)

    // When filter is empty, there is only the close button
    const buttons = screen.getAllByRole("button")
    const closeButton = buttons[buttons.length - 1]
    fireEvent.click(closeButton)

    expect(deactivate).toHaveBeenCalled()
  })

  it("input gets auto-focus on mount", () => {
    const { container } = render(<QuickFilterBar totalCount={10} filteredCount={10} />)

    const input = container.querySelector("input")
    expect(input).toBeDefined()
    expect(document.activeElement).toBe(input)
  })
})
