import { act, fireEvent, render, screen } from "@testing-library/react"
import { useBookmarksStore } from "@/features/bookmarks/model/store"
import { BookmarksList } from "../BookmarksList"

const makeBookmark = (id: string, name: string, path: string, order: number) => ({
  id,
  name,
  path,
  order,
})

describe("BookmarksList", () => {
  beforeEach(() => {
    act(() => {
      useBookmarksStore.setState({ bookmarks: [] })
    })
  })

  it("shows empty state message when bookmarks is empty", () => {
    render(<BookmarksList onSelect={() => {}} />)

    expect(screen.getByText("Нет закладок")).toBeTruthy()
  })

  it("renders bookmark names", () => {
    act(() => {
      useBookmarksStore.setState({
        bookmarks: [
          makeBookmark("1", "Documents", "/home/user/Documents", 0),
          makeBookmark("2", "Downloads", "/home/user/Downloads", 1),
        ],
      })
    })

    render(<BookmarksList onSelect={() => {}} />)

    expect(screen.getByText("Documents")).toBeTruthy()
    expect(screen.getByText("Downloads")).toBeTruthy()
  })

  it("active bookmark has bg-accent class when path matches currentPath", () => {
    act(() => {
      useBookmarksStore.setState({
        bookmarks: [
          makeBookmark("1", "Documents", "/home/user/Documents", 0),
          makeBookmark("2", "Downloads", "/home/user/Downloads", 1),
        ],
      })
    })

    render(<BookmarksList onSelect={() => {}} currentPath="/home/user/Documents" />)

    const docButton = screen.getByText("Documents").closest("button")!
    const dlButton = screen.getByText("Downloads").closest("button")!

    expect(docButton.classList.contains("bg-accent")).toBe(true)
    expect(dlButton.classList.contains("bg-accent")).toBe(false)
  })

  it("clicking bookmark calls onSelect with path", () => {
    const onSelect = vi.fn()

    act(() => {
      useBookmarksStore.setState({
        bookmarks: [makeBookmark("1", "Documents", "/home/user/Documents", 0)],
      })
    })

    render(<BookmarksList onSelect={onSelect} />)

    fireEvent.click(screen.getByText("Documents"))
    expect(onSelect).toHaveBeenCalledWith("/home/user/Documents")
  })

  it("bookmarks are sorted by order field", () => {
    act(() => {
      useBookmarksStore.setState({
        bookmarks: [
          makeBookmark("1", "Zebra", "/zebra", 2),
          makeBookmark("2", "Alpha", "/alpha", 0),
          makeBookmark("3", "Middle", "/middle", 1),
        ],
      })
    })

    render(<BookmarksList onSelect={() => {}} />)

    const buttons = screen.getAllByRole("button")
    const names = buttons.map((b) => b.textContent?.trim())

    expect(names.indexOf("Alpha")).toBeLessThan(names.indexOf("Middle"))
    expect(names.indexOf("Middle")).toBeLessThan(names.indexOf("Zebra"))
  })

  it("multiple bookmarks render correctly", () => {
    const bookmarks = Array.from({ length: 5 }, (_, i) =>
      makeBookmark(`id-${i}`, `Folder ${i}`, `/path/${i}`, i),
    )

    act(() => {
      useBookmarksStore.setState({ bookmarks })
    })

    render(<BookmarksList onSelect={() => {}} />)

    for (let i = 0; i < 5; i++) {
      expect(screen.getByText(`Folder ${i}`)).toBeTruthy()
    }
  })

  it("drops a dragged folder path into bookmarks", () => {
    render(<BookmarksList onSelect={() => {}} />)

    const dropZone = screen.getByText("Нет закладок").closest("div")!
    const payload = JSON.stringify({ paths: ["/home/user/Documents"], action: "move" })

    fireEvent.dragOver(dropZone, {
      dataTransfer: { dropEffect: "none" },
    })
    fireEvent.drop(dropZone, {
      dataTransfer: {
        getData: (type: string) =>
          type === "application/x-file-manager-paths" || type === "application/json" ? payload : "",
      },
    })

    expect(useBookmarksStore.getState().bookmarks).toHaveLength(1)
    expect(useBookmarksStore.getState().bookmarks[0]?.path).toBe("/home/user/Documents")
  })
})
