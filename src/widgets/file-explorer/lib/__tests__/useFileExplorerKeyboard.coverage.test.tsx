/// <reference types="vitest" />

import { act, cleanup, render } from "@testing-library/react"
import { useBookmarksStore } from "@/features/bookmarks/model/store"
import { useCommandPaletteStore } from "@/features/command-palette/model/store"
import { useSelectionStore } from "@/features/file-selection"
import { useInlineEditStore } from "@/features/inline-edit"
import { useNavigationStore } from "@/features/navigation"
import { useOperationsHistoryStore } from "@/features/operations-history"
import { useSettingsStore } from "@/features/settings"
import type { FileEntry } from "@/shared/api/tauri"
import { setLastFiles } from "@/shared/lib/devLogger"
import { useFileExplorerKeyboard } from "../useFileExplorerKeyboard"

const files: FileEntry[] = [
  {
    path: "/a",
    name: "a",
    is_dir: false,
    size: 1,
    modified: 1,
    created: null,
    is_hidden: false,
    extension: "txt",
  },
  {
    path: "/b",
    name: "b",
    is_dir: false,
    size: 1,
    modified: 1,
    created: null,
    is_hidden: false,
    extension: "txt",
  },
]

function mountKeyboard(overrides = {}) {
  const callbacks = {
    onCopy: vi.fn(),
    onCut: vi.fn(),
    onPaste: vi.fn(),
    onDelete: vi.fn(),
    onStartNewFolder: vi.fn(),
    onStartRename: vi.fn(),
    onRefresh: vi.fn(),
    onQuickLook: vi.fn(),
    ...overrides,
  }

  function TestComp() {
    useFileExplorerKeyboard({ files, ...callbacks })
    return <div />
  }

  const view = render(<TestComp />)
  return { ...callbacks, unmount: () => view.unmount() }
}

describe("useFileExplorerKeyboard extended coverage", () => {
  beforeEach(() => {
    ;(globalThis as { __fm_perfEnabled?: boolean }).__fm_perfEnabled = true
    act(() => {
      useNavigationStore.setState({ currentPath: "/", history: ["/", "/a"], historyIndex: 1 })
      useInlineEditStore.setState({ mode: null, targetPath: null, parentPath: null })
      useSelectionStore.getState().clearSelection()
      useBookmarksStore.setState({ bookmarks: [] })
      useSettingsStore.getState().resetSettings()
      setLastFiles(files)
    })
  })

  afterEach(() => {
    cleanup()
  })

  it("vim j/k navigation selects next and previous files", () => {
    act(() => {
      useSettingsStore.getState().updateKeyboard({ enableVimMode: true, shortcuts: [] })
      useSelectionStore.getState().selectFile("/a")
    })
    const { unmount } = mountKeyboard()

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "j", bubbles: true }))
    })
    expect(useSelectionStore.getState().lastSelectedPath).toBe("/b")

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", bubbles: true }))
    })
    expect(useSelectionStore.getState().lastSelectedPath).toBe("/a")
    unmount()
  })

  it("vim G selects last file and gg selects first", () => {
    act(() => {
      useSettingsStore.getState().updateKeyboard({ enableVimMode: true, shortcuts: [] })
    })
    const { unmount } = mountKeyboard()

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "G", bubbles: true }))
    })
    expect(useSelectionStore.getState().lastSelectedPath).toBe("/b")

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "g", bubbles: true }))
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "g", bubbles: true }))
    })
    expect(useSelectionStore.getState().lastSelectedPath).toBe("/a")
    unmount()
  })

  it("triggers undo, settings, and command palette shortcuts", () => {
    const undoSpy = vi
      .spyOn(useOperationsHistoryStore.getState(), "undoLastOperation")
      .mockResolvedValue(null)
    const openSettings = vi.spyOn(useSettingsStore.getState(), "open")
    const togglePalette = vi.spyOn(useCommandPaletteStore.getState(), "toggle")

    act(() => {
      useSettingsStore.getState().updateKeyboard({
        shortcuts: [
          { id: "undo", action: "Undo", keys: "Ctrl+Z", enabled: true },
          { id: "settings", action: "Settings", keys: "Ctrl+,", enabled: true },
          { id: "commandPalette", action: "Palette", keys: "Ctrl+Shift+P", enabled: true },
        ],
      })
    })

    const { unmount } = mountKeyboard()

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "z", code: "KeyZ", ctrlKey: true, bubbles: true }),
      )
    })
    expect(undoSpy).toHaveBeenCalled()

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: ",", code: "Comma", ctrlKey: true, bubbles: true }),
      )
    })
    expect(openSettings).toHaveBeenCalled()

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "P",
          code: "KeyP",
          ctrlKey: true,
          shiftKey: true,
          bubbles: true,
        }),
      )
    })
    expect(togglePalette).toHaveBeenCalled()
    unmount()
  })

  it("triggers quick look on space and navigation fallbacks", () => {
    const { onQuickLook, unmount } = mountKeyboard()

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: " ", code: "Space", bubbles: true }))
    })
    expect(onQuickLook).toHaveBeenCalled()

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "ArrowLeft",
          code: "ArrowLeft",
          altKey: true,
          bubbles: true,
        }),
      )
    })
    expect(useNavigationStore.getState().currentPath).toBe("/")

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "ArrowRight",
          code: "ArrowRight",
          altKey: true,
          bubbles: true,
        }),
      )
    })
    expect(useNavigationStore.getState().currentPath).toBe("/a")

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "ArrowUp",
          code: "ArrowUp",
          altKey: true,
          bubbles: true,
        }),
      )
    })
    unmount()
  })

  it("ignores shortcuts while inline edit mode is active", () => {
    const { onCopy, unmount } = mountKeyboard()
    act(() => {
      useInlineEditStore.setState({ mode: "rename", targetPath: "/a", parentPath: null })
      useSettingsStore.getState().updateKeyboard({
        shortcuts: [{ id: "copy", action: "Copy", keys: "Ctrl+C", enabled: true }],
      })
    })

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "c", code: "KeyC", ctrlKey: true, bubbles: true }),
      )
    })
    expect(onCopy).not.toHaveBeenCalled()
    unmount()
  })
})
