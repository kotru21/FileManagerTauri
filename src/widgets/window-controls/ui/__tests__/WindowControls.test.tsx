import { fireEvent, render, screen, waitFor } from "@testing-library/react"

const mockMinimize = vi.fn()
const mockToggleMaximize = vi.fn()
const mockClose = vi.fn()

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({
    minimize: mockMinimize,
    toggleMaximize: mockToggleMaximize,
    close: mockClose,
    isMaximized: vi.fn(() => Promise.resolve(false)),
    onResized: vi.fn(() => Promise.resolve(() => {})),
  }),
}))

import { WindowControls } from "../WindowControls"

describe("WindowControls", () => {
  beforeEach(() => {
    mockMinimize.mockClear()
    mockToggleMaximize.mockClear()
    mockClose.mockClear()
  })

  it("renders three buttons (minimize, maximize, close)", async () => {
    render(<WindowControls />)

    await waitFor(() => {
      expect(screen.getByLabelText("Свернуть")).toBeDefined()
      expect(screen.getByLabelText("Развернуть")).toBeDefined()
      expect(screen.getByLabelText("Закрыть")).toBeDefined()
    })
  })

  it("clicking minimize calls minimize()", async () => {
    render(<WindowControls />)

    await waitFor(() => {
      expect(screen.getByLabelText("Свернуть")).toBeDefined()
    })

    fireEvent.click(screen.getByLabelText("Свернуть"))

    await waitFor(() => {
      expect(mockMinimize).toHaveBeenCalledTimes(1)
    })
  })

  it("clicking maximize calls toggleMaximize()", async () => {
    render(<WindowControls />)

    await waitFor(() => {
      expect(screen.getByLabelText("Развернуть")).toBeDefined()
    })

    fireEvent.click(screen.getByLabelText("Развернуть"))

    await waitFor(() => {
      expect(mockToggleMaximize).toHaveBeenCalledTimes(1)
    })
  })

  it("clicking close calls close()", async () => {
    render(<WindowControls />)

    await waitFor(() => {
      expect(screen.getByLabelText("Закрыть")).toBeDefined()
    })

    fireEvent.click(screen.getByLabelText("Закрыть"))

    await waitFor(() => {
      expect(mockClose).toHaveBeenCalledTimes(1)
    })
  })

  it('maximize button has aria-label "Развернуть" when not maximized', async () => {
    render(<WindowControls />)

    await waitFor(() => {
      const maximizeBtn = screen.getByLabelText("Развернуть")
      expect(maximizeBtn).toBeDefined()
      expect(maximizeBtn.getAttribute("aria-label")).toBe("Развернуть")
    })
  })
})
