import { renderHook } from "@testing-library/react"
import { act } from "react"
import { useCommandPaletteStore } from "@/features/command-palette"
import { useNavigationStore } from "@/features/navigation"
import { useRegisterCommands } from "../useRegisterCommands"

describe("useRegisterCommands action coverage", () => {
  beforeEach(() => {
    useCommandPaletteStore.setState({
      commands: [],
      registerCommands: (cmds) => {
        useCommandPaletteStore.setState({ commands: cmds })
      },
      unregisterCommands: () => {
        useCommandPaletteStore.setState({ commands: [] })
      },
    })
    act(() => {
      useNavigationStore.setState({ currentPath: "/work", history: ["/work"], historyIndex: 0 })
    })
  })

  it("registers commands and executes key actions", () => {
    const onRefresh = vi.fn()
    const onDelete = vi.fn()
    const onOpenSettings = vi.fn()

    renderHook(() => useRegisterCommands({ onRefresh, onDelete, onOpenSettings }))

    const commands = useCommandPaletteStore.getState().commands
    expect(commands.length).toBeGreaterThan(5)

    const byId = (id: string) => commands.find((c) => c.id === id)

    act(() => byId("nav-refresh")?.action())
    expect(onRefresh).toHaveBeenCalled()

    act(() => byId("file-delete")?.action())
    expect(onDelete).toHaveBeenCalled()

    act(() => byId("settings-open")?.action())
    expect(onOpenSettings).toHaveBeenCalled()

    act(() => byId("file-new-folder")?.action())
    act(() => byId("file-new-file")?.action())
    act(() => byId("edit-copy")?.action())
    act(() => byId("edit-cut")?.action())
    act(() => byId("view-toggle-hidden")?.action())
    act(() => byId("view-list")?.action())
    act(() => byId("view-grid")?.action())
    act(() => byId("search-filter")?.action())
    act(() => byId("bookmark-toggle")?.action())
    act(() => byId("nav-back")?.action())
    act(() => byId("nav-forward")?.action())
    act(() => byId("edit-clear-selection")?.action())
    act(() => byId("edit-select-all")?.action())
    act(() => byId("nav-up")?.action())
  })
})
