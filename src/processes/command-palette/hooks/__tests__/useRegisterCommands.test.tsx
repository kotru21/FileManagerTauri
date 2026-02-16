import { act, render } from "@testing-library/react"
import { useNavigationStore } from "@/features/navigation"
import { useRegisterCommands } from "../useRegisterCommands"

interface MockCommand {
  id: string
  title: string
  category: string
  action: () => void
}

const { mockRegister, mockUnregister } = vi.hoisted(() => ({
  mockRegister: vi.fn(),
  mockUnregister: vi.fn(),
}))

vi.mock("@/features/command-palette", () => ({
  useCommandPaletteStore: () => ({
    registerCommands: mockRegister,
    unregisterCommands: mockUnregister,
  }),
}))

function TestHarness({
  onRefresh = vi.fn(),
  onDelete = vi.fn(),
  onOpenSettings = vi.fn(),
}: Partial<{
  onRefresh: () => void
  onDelete: () => void
  onOpenSettings: () => void
}>) {
  useRegisterCommands({ onRefresh, onDelete, onOpenSettings })
  return <div data-testid="mounted">ready</div>
}

function getRegisteredCommands(): MockCommand[] {
  return mockRegister.mock.calls[0][0] as MockCommand[]
}

describe("useRegisterCommands", () => {
  beforeEach(() => {
    mockRegister.mockClear()
    mockUnregister.mockClear()
    act(() => {
      useNavigationStore.setState({ currentPath: "/home/user" })
    })
  })

  it("registers commands on mount", () => {
    render(<TestHarness />)

    expect(mockRegister).toHaveBeenCalled()
    const commands = getRegisteredCommands()
    expect(commands.length).toBeGreaterThan(0)
  })

  it("registers all expected command IDs", () => {
    render(<TestHarness />)

    const ids = getRegisteredCommands().map((c) => c.id)
    expect(ids).toContain("nav-back")
    expect(ids).toContain("nav-forward")
    expect(ids).toContain("nav-up")
    expect(ids).toContain("nav-refresh")
    expect(ids).toContain("file-new-folder")
    expect(ids).toContain("file-new-file")
    expect(ids).toContain("file-delete")
    expect(ids).toContain("edit-copy")
    expect(ids).toContain("edit-cut")
    expect(ids).toContain("edit-select-all")
    expect(ids).toContain("edit-clear-selection")
    expect(ids).toContain("view-list")
    expect(ids).toContain("view-grid")
    expect(ids).toContain("view-toggle-hidden")
    expect(ids).toContain("search-filter")
    expect(ids).toContain("bookmark-toggle")
    expect(ids).toContain("settings-open")
  })

  it("unregisters commands on unmount", () => {
    const { unmount } = render(<TestHarness />)

    expect(mockRegister).toHaveBeenCalled()

    unmount()

    expect(mockUnregister).toHaveBeenCalledTimes(1)
    const unregisteredIds = mockUnregister.mock.calls[0][0] as string[]
    expect(unregisteredIds.length).toBeGreaterThan(0)
  })

  it("nav-refresh command calls onRefresh", () => {
    const onRefresh = vi.fn()
    render(<TestHarness onRefresh={onRefresh} />)

    const cmd = getRegisteredCommands().find((c) => c.id === "nav-refresh")
    expect(cmd).toBeDefined()

    act(() => cmd!.action())

    expect(onRefresh).toHaveBeenCalled()
  })

  it("file-delete command calls onDelete", () => {
    const onDelete = vi.fn()
    render(<TestHarness onDelete={onDelete} />)

    const cmd = getRegisteredCommands().find((c) => c.id === "file-delete")

    act(() => cmd!.action())

    expect(onDelete).toHaveBeenCalled()
  })

  it("settings-open command calls onOpenSettings", () => {
    const onOpenSettings = vi.fn()
    render(<TestHarness onOpenSettings={onOpenSettings} />)

    const cmd = getRegisteredCommands().find((c) => c.id === "settings-open")

    act(() => cmd!.action())

    expect(onOpenSettings).toHaveBeenCalled()
  })

  it("includes all expected command categories", () => {
    render(<TestHarness />)

    const categories = new Set(getRegisteredCommands().map((c) => c.category))

    expect(categories).toContain("navigation")
    expect(categories).toContain("file")
    expect(categories).toContain("edit")
    expect(categories).toContain("view")
    expect(categories).toContain("search")
    expect(categories).toContain("other")
  })

  it("all commands have required fields", () => {
    render(<TestHarness />)

    for (const cmd of getRegisteredCommands()) {
      expect(cmd.id).toBeTruthy()
      expect(cmd.title).toBeTruthy()
      expect(cmd.category).toBeTruthy()
      expect(typeof cmd.action).toBe("function")
    }
  })
})
