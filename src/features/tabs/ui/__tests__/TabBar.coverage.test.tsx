import { act, fireEvent, render, screen } from "@testing-library/react"
import { useTabsStore } from "@/features/tabs/model/store"
import { TabBar } from "../TabBar"

const mockTabs = [
  { id: "tab-1", title: "One", path: "/one", isPinned: false },
  { id: "tab-2", title: "Two", path: "/two", isPinned: false },
  { id: "tab-3", title: "Three", path: "/three", isPinned: false },
]

describe("TabBar extended coverage", () => {
  beforeEach(() => {
    act(() => useTabsStore.setState({ tabs: [], activeTabId: null }))
  })

  it("creates a new tab from the plus button", () => {
    act(() => useTabsStore.setState({ tabs: mockTabs.slice(0, 1), activeTabId: "tab-1" }))
    const onTabChange = vi.fn()
    render(<TabBar onTabChange={onTabChange} />)

    fireEvent.click(screen.getByLabelText("Новая вкладка"))
    expect(useTabsStore.getState().tabs.length).toBe(2)
    expect(onTabChange).toHaveBeenCalled()
  })

  it("reorders tabs via drag and drop", () => {
    act(() => useTabsStore.setState({ tabs: mockTabs, activeTabId: "tab-1" }))
    render(<TabBar />)

    const tabs = document.querySelectorAll("[draggable]")
    const first = tabs[0] as HTMLElement
    const second = tabs[1] as HTMLElement

    fireEvent.dragStart(first, { dataTransfer: { effectAllowed: "move" } })
    fireEvent.dragOver(second, { dataTransfer: { dropEffect: "move" } })
    fireEvent.drop(second, { dataTransfer: { dropEffect: "move" } })

    expect(useTabsStore.getState().tabs[0]?.id).toBe("tab-2")
  })

  it("renders injected window controls", () => {
    act(() => useTabsStore.setState({ tabs: mockTabs.slice(0, 1), activeTabId: "tab-1" }))
    render(<TabBar controls={<div data-testid="window-controls">ctrl</div>} />)
    expect(screen.getByTestId("window-controls")).toBeDefined()
  })
})
