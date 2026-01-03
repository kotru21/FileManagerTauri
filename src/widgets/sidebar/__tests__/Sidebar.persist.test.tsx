import { fireEvent, render } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useLayoutStore } from "@/entities/layout"
import { Sidebar } from "../ui/Sidebar"

// Mock recent folders so Sidebar can render list items
vi.mock("@/features/recent-folders", async () => {
  const actual = await vi.importActual<typeof import("@/features/recent-folders")>(
    "@/features/recent-folders",
  )
  return {
    ...actual,
    useRecentFoldersStore: () => ({
      folders: [
        { name: "One", path: "/one", lastVisited: Date.now() },
        { name: "Two", path: "/two", lastVisited: Date.now() },
      ],
      removeFolder: vi.fn(),
      clearAll: vi.fn(),
      addFolder: vi.fn(),
    }),
  }
})

// Mock drives to avoid react-query requirement in tests
vi.mock("@/entities/file-entry", async () => {
  const actual =
    await vi.importActual<typeof import("@/entities/file-entry")>("@/entities/file-entry")
  return {
    ...actual,
    useDrives: () => ({ data: [] }),
  }
})

// Mock bookmarks store to prevent undefined issues
vi.mock("@/features/bookmarks", async () => {
  const actual =
    await vi.importActual<typeof import("@/features/bookmarks")>("@/features/bookmarks")
  return {
    ...actual,
    useBookmarksStore: () => ({ bookmarks: [] }),
  }
})

// Mock navigation store
vi.mock("@/features/navigation", async () => {
  const actual =
    await vi.importActual<typeof import("@/features/navigation")>("@/features/navigation")
  return {
    ...actual,
    useNavigationStore: () => ({ currentPath: "/", navigate: vi.fn() }),
  }
})

describe("Sidebar persistence", () => {
  beforeEach(() => {
    // reset layout store to defaults before each test
    useLayoutStore.getState().resetLayout()
  })

  it("toggle updates store", () => {
    const { getByText } = render(<Sidebar />)

    const recent = getByText("Недавние")
    // initially expanded -> toggle to collapse
    fireEvent.click(recent)

    expect(useLayoutStore.getState().layout.expandedSections?.recent).toBe(false)
  })

  it("restores stored state on mount", () => {
    // set collapsed in store before mounting
    useLayoutStore.getState().setSectionExpanded("recent", false)

    const { queryByText } = render(<Sidebar />)

    // The RecentFoldersList should not render folder "One"
    expect(queryByText("One")).toBeNull()
  })
})
