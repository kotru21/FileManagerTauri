import "@testing-library/jest-dom/vitest"
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { TooltipProvider } from "@/shared/ui"
import { Sidebar } from "../Sidebar"

vi.mock("@/entities/file-entry", () => ({
  useDrives: () => ({
    data: [{ name: "C:", path: "C:\\", label: "Local Disk" }],
    isLoading: false,
  }),
}))

vi.mock("@/features/bookmarks", () => ({
  BookmarksList: () => <div data-testid="bookmarks-list" />,
  useBookmarksStore: () => ({ bookmarks: [], addBookmark: vi.fn() }),
}))

vi.mock("@/features/navigation", () => ({
  useNavigationStore: () => ({ navigate: vi.fn(), currentPath: "C:\\Users" }),
}))

vi.mock("@/features/recent-folders", () => ({
  RecentFoldersList: () => <div data-testid="recent-list" />,
  useRecentFoldersStore: () => ({ folders: [], addFolder: vi.fn() }),
}))

function renderSidebar(props: React.ComponentProps<typeof Sidebar>) {
  return render(
    <TooltipProvider>
      <Sidebar {...props} />
    </TooltipProvider>,
  )
}

describe("Sidebar", () => {
  it("renders expanded sections", () => {
    renderSidebar({ collapsed: false })
    expect(screen.getByTestId("bookmarks-list")).toBeInTheDocument()
    expect(screen.getByText(/Диски/i)).toBeInTheDocument()
  })

  it("renders collapsed icon buttons", () => {
    renderSidebar({ collapsed: true })
    expect(screen.getByLabelText(/Закладки/i)).toBeInTheDocument()
  })
})
