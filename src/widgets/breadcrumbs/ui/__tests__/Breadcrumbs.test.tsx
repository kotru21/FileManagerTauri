import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { useNavigationStore } from "@/features/navigation/model/store"
import { tauriClient } from "@/shared/api/tauri/client"
import { Breadcrumbs } from "../Breadcrumbs"

vi.mock("@/shared/api/tauri/client", () => ({
  tauriClient: {
    pathExists: vi.fn(),
    getParentPath: vi.fn(),
  },
}))

const mockPathExists = tauriClient.pathExists as ReturnType<typeof vi.fn>

describe("Breadcrumbs", () => {
  const mockNavigate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    act(() => {
      useNavigationStore.setState({
        currentPath: "C:/Users/Documents",
        navigate: mockNavigate,
        history: ["C:/Users/Documents"],
        historyIndex: 0,
      })
    })
  })

  it("renders Home button", () => {
    render(<Breadcrumbs />)

    // Home button is a button with an svg icon
    const buttons = screen.getAllByRole("button")
    expect(buttons.length).toBeGreaterThanOrEqual(1)

    // The first button should be the home button
    const homeButton = buttons[0]
    const svg = homeButton.querySelector("svg")
    expect(svg).not.toBeNull()
  })

  it("parses path into segments with correct names", () => {
    render(<Breadcrumbs />)

    expect(screen.getByText("C:")).toBeDefined()
    expect(screen.getByText("Users")).toBeDefined()
    expect(screen.getByText("Documents")).toBeDefined()
  })

  it("last segment has font-medium class", () => {
    render(<Breadcrumbs />)

    const lastSegment = screen.getByText("Documents")
    expect(lastSegment.className).toContain("font-medium")
  })

  it("clicking a segment calls navigate with segment path", () => {
    render(<Breadcrumbs />)

    fireEvent.click(screen.getByText("Users"))

    expect(mockNavigate).toHaveBeenCalledWith("C:/Users")
  })

  it("double-click enters edit mode (shows input)", () => {
    const { container } = render(<Breadcrumbs />)

    // Double click on the breadcrumbs container to enter edit mode
    const breadcrumbsDiv = container.firstElementChild!
    fireEvent.doubleClick(breadcrumbsDiv)

    const input = screen.getByPlaceholderText("Введите путь...")
    expect(input).toBeDefined()
  })

  it("in edit mode, Enter with valid path navigates", async () => {
    mockPathExists.mockResolvedValue(true)

    const { container } = render(<Breadcrumbs />)

    // Enter edit mode
    const breadcrumbsDiv = container.firstElementChild!
    fireEvent.doubleClick(breadcrumbsDiv)

    const input = screen.getByPlaceholderText("Введите путь...")
    fireEvent.change(input, { target: { value: "D:/NewPath" } })
    fireEvent.keyDown(input, { key: "Enter" })

    await waitFor(() => {
      expect(mockPathExists).toHaveBeenCalled()
      expect(mockNavigate).toHaveBeenCalledWith("D:\\NewPath")
    })
  })

  it("in edit mode, Escape cancels editing", () => {
    const { container } = render(<Breadcrumbs />)

    // Enter edit mode
    const breadcrumbsDiv = container.firstElementChild!
    fireEvent.doubleClick(breadcrumbsDiv)

    const input = screen.getByPlaceholderText("Введите путь...")
    fireEvent.keyDown(input, { key: "Escape" })

    // After escape, we should be back to breadcrumbs view (no input)
    expect(screen.queryByPlaceholderText("Введите путь...")).toBeNull()
    expect(screen.getByText("Documents")).toBeDefined()
  })

  it("shows error when pathExists returns false", async () => {
    mockPathExists.mockResolvedValue(false)

    const { container } = render(<Breadcrumbs />)

    // Enter edit mode
    const breadcrumbsDiv = container.firstElementChild!
    fireEvent.doubleClick(breadcrumbsDiv)

    const input = screen.getByPlaceholderText("Введите путь...")
    fireEvent.change(input, { target: { value: "Z:/NonExistent" } })
    fireEvent.keyDown(input, { key: "Enter" })

    await waitFor(() => {
      expect(screen.getByText("Путь не существует")).toBeDefined()
    })
  })
})
