/// <reference types="vitest" />

import { openPath } from "@tauri-apps/plugin-opener"
import { act, render } from "@testing-library/react"
import { useClipboardStore } from "@/features/clipboard"
import { useSelectionStore } from "@/features/file-selection"
import { useInlineEditStore } from "@/features/inline-edit"
import { useNavigationStore } from "@/features/navigation"
import { useSettingsStore } from "@/features/settings"
import { useTabsStore } from "@/features/tabs"
import type { FileEntry } from "@/shared/api/tauri"
import { useFileExplorerHandlers } from "../useFileExplorerHandlers"

const files: FileEntry[] = [
  {
    path: "/dir1",
    name: "dir1",
    is_dir: true,
    size: 0,
    modified: 1,
    created: null,
    is_hidden: false,
    extension: "",
  },
  {
    path: "/file1.txt",
    name: "file1.txt",
    is_dir: false,
    size: 10,
    modified: 1,
    created: null,
    is_hidden: false,
    extension: "txt",
  },
]

function setupHandlers(overrides?: Partial<Parameters<typeof useFileExplorerHandlers>[0]>) {
  act(() => {
    useInlineEditStore.getState().reset()
    useClipboardStore.setState({ paths: [], action: null })
    useNavigationStore.setState({ currentPath: "/" })
    useSelectionStore.getState().clearSelection()
    useSettingsStore.getState().resetSettings()
    useTabsStore.setState({ tabs: [], activeTabId: null })
  })

  let handlers!: ReturnType<typeof useFileExplorerHandlers>

  function TestComp() {
    handlers = useFileExplorerHandlers({
      files,
      createDirectory: overrides?.createDirectory ?? vi.fn(async () => {}),
      createFile: overrides?.createFile ?? vi.fn(async () => {}),
      renameEntry: overrides?.renameEntry ?? vi.fn(async () => {}),
      deleteEntries: overrides?.deleteEntries ?? vi.fn(async () => {}),
      copyEntries: overrides?.copyEntries ?? vi.fn(async () => {}),
      moveEntries: overrides?.moveEntries ?? vi.fn(async () => {}),
      onStartCopyWithProgress: overrides?.onStartCopyWithProgress ?? vi.fn(),
    })
    return <div data-testid="handlers-root" />
  }

  const root = render(<TestComp />)
  return { handlers, cleanup: () => root.unmount() }
}

describe("useFileExplorerHandlers extended coverage", () => {
  it("opens files with openPath and handles errors", async () => {
    vi.mocked(openPath).mockRejectedValueOnce(new Error("fail"))
    const { handlers, cleanup } = setupHandlers()

    await act(async () => {
      await handlers.handleOpen("/file1.txt", false)
    })
    expect(openPath).toHaveBeenCalledWith("/file1.txt")
    cleanup()
  })

  it("handleDrop moves entries and records operation", async () => {
    const moveEntries = vi.fn(async () => {})
    const { handlers, cleanup } = setupHandlers({ moveEntries })

    await act(async () => {
      await handlers.handleDrop(["/file1.txt"], "/dir1")
    })
    expect(moveEntries).toHaveBeenCalledWith({ sources: ["/file1.txt"], destination: "/dir1" })
    cleanup()
  })

  it("creates folder and file with operations", async () => {
    const createDirectory = vi.fn(async () => {})
    const createFile = vi.fn(async () => {})
    const { handlers, cleanup } = setupHandlers({ createDirectory, createFile })

    await act(async () => {
      await handlers.handleCreateFolder("newfolder")
    })
    expect(createDirectory).toHaveBeenCalled()

    await act(async () => {
      await handlers.handleCreateFile("newfile.txt")
    })
    expect(createFile).toHaveBeenCalled()
    cleanup()
  })

  it("copy and cut selected paths update clipboard", () => {
    const { handlers, cleanup } = setupHandlers()
    act(() => {
      useSelectionStore.getState().selectFile("/file1.txt")
    })

    act(() => handlers.handleCopy())
    expect(useClipboardStore.getState().paths).toEqual(["/file1.txt"])

    act(() => handlers.handleCut())
    expect(useClipboardStore.getState().action).toBe("cut")
    cleanup()
  })

  it("handlePaste copies when no conflict", async () => {
    const copyEntries = vi.fn(async () => {})
    const { handlers, cleanup } = setupHandlers({ copyEntries })

    act(() => {
      useClipboardStore.setState({ paths: ["/other/file2.txt"], action: "copy" })
      useSettingsStore.getState().updateBehavior({ confirmOverwrite: false })
    })

    await act(async () => {
      await handlers.handlePaste()
    })
    expect(copyEntries).toHaveBeenCalled()
    cleanup()
  })

  it("handlePaste moves on cut action", async () => {
    const moveEntries = vi.fn(async () => {})
    const { handlers, cleanup } = setupHandlers({ moveEntries })

    act(() => {
      useClipboardStore.setState({ paths: ["/other/file2.txt"], action: "cut" })
      useSettingsStore.getState().updateBehavior({ confirmOverwrite: false })
    })

    await act(async () => {
      await handlers.handlePaste()
    })
    expect(moveEntries).toHaveBeenCalled()
    cleanup()
  })

  it("handleDelete removes selected entries", async () => {
    const deleteEntries = vi.fn(async () => {})
    const { handlers, cleanup } = setupHandlers({ deleteEntries })

    act(() => {
      useSelectionStore.getState().selectFile("/file1.txt")
    })

    await act(async () => {
      await handlers.handleDelete()
    })
    expect(deleteEntries).toHaveBeenCalledWith({ paths: ["/file1.txt"] })
    cleanup()
  })

  it("handleCopyPath writes to clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })

    const { handlers, cleanup } = setupHandlers()
    act(() => useSelectionStore.getState().selectFile("/file1.txt"))
    await act(async () => {
      handlers.handleCopyPath()
    })
    expect(writeText).toHaveBeenCalledWith("/file1.txt")
    cleanup()
  })

  it("handleOpenInExplorer opens selected path", async () => {
    const { handlers, cleanup } = setupHandlers()
    act(() => useSelectionStore.getState().selectFile("/file1.txt"))
    await act(async () => {
      await handlers.handleOpenInExplorer()
    })
    expect(openPath).toHaveBeenCalledWith("/file1.txt")
    cleanup()
  })

  it("handleOpenInTerminal opens selected path", async () => {
    const { handlers, cleanup } = setupHandlers()
    act(() => useSelectionStore.getState().selectFile("/file1.txt"))
    await act(async () => {
      await handlers.handleOpenInTerminal()
    })
    expect(openPath).toHaveBeenCalledWith("/file1.txt")
    cleanup()
  })

  it("handleStartRename requires single selection", () => {
    const { handlers, cleanup } = setupHandlers()
    act(() => {
      useSelectionStore.getState().selectFile("/file1.txt")
      useSelectionStore.getState().selectFile("/dir1", true)
    })
    act(() => handlers.handleStartRename())
    expect(useInlineEditStore.getState().mode).toBeNull()
    cleanup()
  })
})
