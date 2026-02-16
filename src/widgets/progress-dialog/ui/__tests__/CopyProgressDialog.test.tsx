import { act, render, screen } from "@testing-library/react"
import { CopyProgressDialog } from "../CopyProgressDialog"

type EventCallback = (event: { payload: { current: number; total: number; file: string } }) => void

let mockListenCallback: EventCallback = () => {}

vi.mock("@/shared/api/tauri", () => ({
  tauriEvents: {
    copyProgress: vi.fn((cb: EventCallback) => {
      mockListenCallback = cb
      return Promise.resolve(() => {})
    }),
  },
}))

describe("CopyProgressDialog", () => {
  beforeEach(() => {
    mockListenCallback = () => {}
  })

  it("returns null when open=false", () => {
    const { container } = render(<CopyProgressDialog open={false} />)
    expect(container.innerHTML).toBe("")
  })

  it("returns null when open but no progress event received", () => {
    const { container } = render(<CopyProgressDialog open={true} />)
    expect(container.innerHTML).toBe("")
  })

  it("shows progress bar and current/total after event", () => {
    render(<CopyProgressDialog open={true} />)

    act(() => {
      mockListenCallback({
        payload: { current: 3, total: 10, file: "C:/Users/Documents/test.txt" },
      })
    })

    expect(screen.getByText("3 / 10")).toBeDefined()
    expect(screen.getByText("Копирование файлов...")).toBeDefined()
  })

  it("shows filename extracted from path", () => {
    render(<CopyProgressDialog open={true} />)

    act(() => {
      mockListenCallback({
        payload: { current: 1, total: 5, file: "C:/Users/Documents/report.pdf" },
      })
    })

    expect(screen.getByText("report.pdf")).toBeDefined()
  })

  it("cancel button calls onCancel when present", () => {
    const onCancel = vi.fn()
    render(<CopyProgressDialog open={true} onCancel={onCancel} />)

    act(() => {
      mockListenCallback({
        payload: { current: 2, total: 8, file: "C:/some/file.txt" },
      })
    })

    const cancelButton = screen.getByText("Отмена")
    cancelButton.click()

    expect(onCancel).toHaveBeenCalled()
  })
})
