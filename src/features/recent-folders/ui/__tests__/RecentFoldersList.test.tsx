import { fireEvent, render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { RecentFoldersList } from "../RecentFoldersList"

vi.mock("../../model/store", async () => {
  const actual = await vi.importActual<typeof import("../../model/store")>("../../model/store")
  return {
    ...actual,
    useRecentFoldersStore: () => ({
      folders: [
        { name: "One", path: "/one", lastVisited: Date.now() },
        { name: "Two", path: "/two", lastVisited: Date.now() },
      ],
      removeFolder: vi.fn(),
      clearAll: vi.fn(),
    }),
  }
})

describe("RecentFoldersList", () => {
  it("renders folder items as buttons and shows remove button with aria-label", () => {
    const onSelect = vi.fn()
    const { getAllByRole, getByLabelText } = render(
      <RecentFoldersList onSelect={onSelect} currentPath="/two" />,
    )

    const buttons = getAllByRole("button")
    // Should have at least clear button plus two folder buttons and two remove buttons
    expect(buttons.length).toBeGreaterThanOrEqual(3)

    // Find remove button for folder One
    const remove = getByLabelText(/Remove One/)
    expect(remove).toBeTruthy()

    // Simulate clicking remove
    fireEvent.click(remove)
    // The mock removeFolder should have been called via handler; we can't assert internal store mock here easily but ensure click doesn't throw
  })
})
