import { act, fireEvent, render, screen } from "@testing-library/react"
import { useDeleteConfirmStore } from "@/features/delete-confirm/model/store"
import { DeleteConfirmDialog } from "../DeleteConfirmDialog"

describe("DeleteConfirmDialog", () => {
  beforeEach(() => {
    act(() => {
      useDeleteConfirmStore.setState({
        isOpen: false,
        paths: [],
        onConfirm: null,
      })
    })
  })

  it("renders nothing meaningful when isOpen is false", () => {
    const { container } = render(<DeleteConfirmDialog />)

    expect(screen.queryByText("Удалить выбранные элементы?")).toBeNull()
    expect(container.querySelector("[role='dialog']")).toBeNull()
  })

  it("shows dialog with title when isOpen is true", () => {
    const confirmFn = vi.fn()
    const cancelFn = vi.fn()

    render(<DeleteConfirmDialog />)

    act(() => {
      useDeleteConfirmStore.setState({
        isOpen: true,
        paths: ["/home/user/file.txt"],
        confirm: confirmFn,
        cancel: cancelFn,
      })
    })

    expect(screen.getByText("Удалить выбранные элементы?")).toBeTruthy()
  })

  it("shows file basenames from paths", () => {
    render(<DeleteConfirmDialog />)

    act(() => {
      useDeleteConfirmStore.setState({
        isOpen: true,
        paths: ["/home/user/document.pdf", "/home/user/photo.jpg", "C:\\Users\\readme.txt"],
        confirm: vi.fn(),
        cancel: vi.fn(),
      })
    })

    expect(screen.getByText("document.pdf")).toBeTruthy()
    expect(screen.getByText("photo.jpg")).toBeTruthy()
    expect(screen.getByText("readme.txt")).toBeTruthy()
  })

  it("truncates to 10 items and shows overflow count for >10 paths", () => {
    const paths = Array.from({ length: 15 }, (_, i) => `/home/user/file${i}.txt`)

    render(<DeleteConfirmDialog />)

    act(() => {
      useDeleteConfirmStore.setState({
        isOpen: true,
        paths,
        confirm: vi.fn(),
        cancel: vi.fn(),
      })
    })

    // First 10 should be visible
    for (let i = 0; i < 10; i++) {
      expect(screen.getByText(`file${i}.txt`)).toBeTruthy()
    }

    // Items beyond 10 should not be rendered individually
    expect(screen.queryByText("file10.txt")).toBeNull()

    // Overflow message
    expect(screen.getByText(/и ещё 5 файл\(ов\)/)).toBeTruthy()
  })

  it("shows total element count", () => {
    render(<DeleteConfirmDialog />)

    act(() => {
      useDeleteConfirmStore.setState({
        isOpen: true,
        paths: ["/a.txt", "/b.txt", "/c.txt"],
        confirm: vi.fn(),
        cancel: vi.fn(),
      })
    })

    expect(screen.getByText("Всего: 3 элемент(ов)")).toBeTruthy()
  })

  it("clicking Удалить calls confirm", () => {
    const confirmFn = vi.fn()

    render(<DeleteConfirmDialog />)

    act(() => {
      useDeleteConfirmStore.setState({
        isOpen: true,
        paths: ["/a.txt"],
        confirm: confirmFn,
        cancel: vi.fn(),
      })
    })

    fireEvent.click(screen.getByText("Удалить"))
    expect(confirmFn).toHaveBeenCalledTimes(1)
  })

  it("clicking Отмена calls cancel", () => {
    const cancelFn = vi.fn()

    render(<DeleteConfirmDialog />)

    act(() => {
      useDeleteConfirmStore.setState({
        isOpen: true,
        paths: ["/a.txt"],
        confirm: vi.fn(),
        cancel: cancelFn,
      })
    })

    fireEvent.click(screen.getByText("Отмена"))
    expect(cancelFn).toHaveBeenCalledTimes(1)
  })
})
