import { render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { Sidebar } from "../ui/Sidebar"

vi.mock("@/entities/file-entry", async () => {
  const actual =
    await vi.importActual<typeof import("@/entities/file-entry")>("@/entities/file-entry")
  return {
    ...actual,
    useDrives: () => ({
      data: [
        { path: "/C:/", name: "C:" },
        { path: "/D:/", name: "D:" },
      ],
    }),
  }
})

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

vi.mock("@/features/bookmarks", async () => {
  const actual =
    await vi.importActual<typeof import("@/features/bookmarks")>("@/features/bookmarks")
  return {
    ...actual,
    useBookmarksStore: () => ({ bookmarks: [] }),
  }
})

vi.mock("@/features/navigation", async () => {
  const actual =
    await vi.importActual<typeof import("@/features/navigation")>("@/features/navigation")
  return {
    ...actual,
    useNavigationStore: () => ({ currentPath: "/", navigate: vi.fn() }),
  }
})

describe("Sidebar layout order", () => {
  it("renders Drives before Recent section in expanded view", () => {
    const { getByText } = render(<Sidebar />)
    const drives = getByText("Диски")
    const recent = getByText("Недавние")

    // drives should come before recent in DOM order
    const isBefore = !!(drives.compareDocumentPosition(recent) & Node.DOCUMENT_POSITION_FOLLOWING)
    expect(isBefore).toBe(true)
  })
})
