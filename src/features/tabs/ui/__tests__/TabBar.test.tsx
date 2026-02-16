import { act, fireEvent, render, screen } from "@testing-library/react"
import { useTabsStore } from "@/features/tabs/model/store"
import { TabBar } from "../TabBar"

const mockTabs = [
  { id: "tab-1", title: "Documents", path: "C:/Users/Documents", isPinned: false },
  { id: "tab-2", title: "Downloads", path: "C:/Users/Downloads", isPinned: false },
  { id: "tab-3", title: "Pinned", path: "C:/Pinned", isPinned: true },
]

describe("TabBar", () => {
  beforeEach(() => {
    act(() => {
      useTabsStore.setState({
        tabs: [],
        activeTabId: null,
      })
    })
  })

  it("returns null when tabs empty", () => {
    const { container } = render(<TabBar />)
    expect(container.innerHTML).toBe("")
  })

  it("renders tab titles", () => {
    act(() => {
      useTabsStore.setState({
        tabs: mockTabs,
        activeTabId: "tab-1",
      })
    })

    render(<TabBar />)

    expect(screen.getByText("Documents")).toBeDefined()
    expect(screen.getByText("Downloads")).toBeDefined()
  })

  it("active tab has bg-background class", () => {
    act(() => {
      useTabsStore.setState({
        tabs: mockTabs,
        activeTabId: "tab-1",
      })
    })

    render(<TabBar />)

    const activeTab = screen.getByText("Documents").closest("[draggable]")
    expect(activeTab?.className).toContain("bg-background")
  })

  it("clicking tab calls setActiveTab and onTabChange", () => {
    const onTabChange = vi.fn()
    act(() => {
      useTabsStore.setState({
        tabs: mockTabs,
        activeTabId: "tab-1",
      })
    })

    render(<TabBar onTabChange={onTabChange} />)

    fireEvent.click(screen.getByText("Downloads"))

    expect(onTabChange).toHaveBeenCalledWith("C:/Users/Downloads")
    expect(useTabsStore.getState().activeTabId).toBe("tab-2")
  })

  it("close button on non-pinned tab calls closeTab", () => {
    act(() => {
      useTabsStore.setState({
        tabs: [
          { id: "tab-1", title: "Documents", path: "C:/Users/Documents", isPinned: false },
          { id: "tab-2", title: "Downloads", path: "C:/Users/Downloads", isPinned: false },
        ],
        activeTabId: "tab-1",
      })
    })

    render(<TabBar />)

    // Non-pinned tabs have a close button (X icon) as a child button inside the tab
    const tabElement = screen.getByText("Documents").closest("[draggable]")
    const closeButton = tabElement?.querySelector("button")
    expect(closeButton).toBeDefined()

    fireEvent.click(closeButton!)

    // After closing tab-1, it should be removed
    const state = useTabsStore.getState()
    expect(state.tabs.find((t) => t.id === "tab-1")).toBeUndefined()
  })

  it("new tab button has aria-label", () => {
    act(() => {
      useTabsStore.setState({
        tabs: mockTabs,
        activeTabId: "tab-1",
      })
    })

    render(<TabBar />)

    const newTabButton = screen.getByLabelText("Новая вкладка")
    expect(newTabButton).toBeDefined()
  })

  it("pinned tab shows Pin icon (svg element inside the tab)", () => {
    act(() => {
      useTabsStore.setState({
        tabs: mockTabs,
        activeTabId: "tab-1",
      })
    })

    render(<TabBar />)

    // The pinned tab doesn't show text title, it shows the Pin icon instead
    // Find the third draggable tab (the pinned one)
    const draggableTabs = document.querySelectorAll("[draggable]")
    const pinnedTab = draggableTabs[2]
    expect(pinnedTab).toBeDefined()

    const svgIcon = pinnedTab.querySelector("svg")
    expect(svgIcon).toBeDefined()
    expect(svgIcon).not.toBeNull()
  })
})
