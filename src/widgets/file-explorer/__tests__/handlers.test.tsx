/// <reference types="vitest" />

import { act, cleanup, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useClipboardStore } from "@/features/clipboard"
import { useConfirmStore } from "@/features/confirm"
import { useInlineEditStore } from "@/features/inline-edit"
import { useNavigationStore } from "@/features/navigation"
import { useSettingsStore } from "@/features/settings"
import type { FileEntry } from "@/shared/api/tauri"
import { useFileExplorerHandlers } from "../lib/useFileExplorerHandlers"

const files: FileEntry[] = [
  {
    path: "/dir1",
    name: "dir1",
    is_dir: true,
    size: 0,
    modified: Date.parse("2020-01-01T00:00:00.000Z"),
    created: null,
    is_hidden: false,
    extension: "",
  },
  {
    path: "/file1.txt",
    name: "file1.txt",
    is_dir: false,
    size: 10,
    modified: Date.parse("2020-01-01T00:00:00.000Z"),
    created: null,
    is_hidden: false,
    extension: "txt",
  },
]

type HandlersOverrides = Partial<{
  createDirectory: (path: string) => Promise<void>
  createFile: (path: string) => Promise<void>
  renameEntry: (arg: { oldPath: string; newName: string }) => Promise<void>
  deleteEntries: (arg: { paths: string[]; permanent?: boolean }) => Promise<void>
  copyEntries: (arg: { sources: string[]; destination: string }) => Promise<void>
  moveEntries: (arg: { sources: string[]; destination: string }) => Promise<void>
  onStartCopyWithProgress: (sources: string[], destination: string) => void
}>

function setupHandlers(overrides?: HandlersOverrides) {
  act(() => {
    useInlineEditStore.setState({ mode: null, targetPath: null, parentPath: null })
    useClipboardStore.setState({ paths: [], action: null })
    useNavigationStore.setState({ currentPath: "/" })
  })

  let handlers!: ReturnType<typeof useFileExplorerHandlers>

  function TestComp() {
    const h = useFileExplorerHandlers({
      files,
      createDirectory: overrides?.createDirectory ?? (async () => {}),
      createFile: overrides?.createFile ?? (async () => {}),
      renameEntry: overrides?.renameEntry ?? (async () => {}),
      deleteEntries: overrides?.deleteEntries ?? (async () => {}),
      copyEntries: overrides?.copyEntries ?? (async () => {}),
      moveEntries: overrides?.moveEntries ?? (async () => {}),
      onStartCopyWithProgress: overrides?.onStartCopyWithProgress ?? (() => {}),
    })
    handlers = h
    const inlineStr = useInlineEditStore(
      (s) => `${s.mode ?? ""}|${s.parentPath ?? ""}|${s.targetPath ?? ""}`,
    )

    return <div data-testid="inline">{inlineStr}</div>
  }

  let root: ReturnType<typeof render> | undefined
  act(() => {
    root = render(<TestComp />)
  })

  return {
    getHandlers: () => handlers,
    getInline: () => {
      const s = screen.getByTestId("inline").textContent || "|"
      const [mode, parentPath, targetPath] = s.split("|")
      return { mode: mode || null, parentPath: parentPath || null, targetPath: targetPath || null }
    },
    cleanup: () => {
      try {
        cleanup()
      } catch {
        void 0
      }
      try {
        root?.unmount()
      } catch {
        void 0
      }
    },
  }
}

describe("file explorer handlers", () => {
  beforeEach(() => {
    useInlineEditStore.getState().reset()
    useClipboardStore.setState({ paths: [], action: null })
    useNavigationStore.getState().navigate("/")
    useSettingsStore.getState().updateBehavior({ confirmOverwrite: true })
  })

  it("handleStartRenameAt starts rename for specific path", async () => {
    const { getHandlers, getInline, cleanup } = setupHandlers()
    const handlers = getHandlers()

    act(() => handlers.handleStartRenameAt("/file1.txt"))

    await waitFor(() => {
      const inline = getInline()
      expect(inline.mode).toBe("rename")
      expect(inline.targetPath).toBe("/file1.txt")
    })

    cleanup()
  })

  it("handleRename calls renameEntry and resets inline state", async () => {
    const renameMock = vi.fn(async () => {})
    const { getHandlers, getInline, cleanup } = setupHandlers({ renameEntry: renameMock })
    const handlers = getHandlers()
    act(() => {
      handlers.handleStartRenameAt("/file1.txt")
    })
    await act(async () => {
      await handlers.handleRename("/file1.txt", "newname.txt")
    })

    expect(renameMock).toHaveBeenCalledWith({ oldPath: "/file1.txt", newName: "newname.txt" })
    await waitFor(() => {
      const inline = getInline()
      expect(inline.mode).toBeNull()
      expect(inline.targetPath).toBeNull()
    })

    cleanup()
  })

  it("handleStartNewFolder and handleStartNewFile set inline edit parentPath", async () => {
    const { getHandlers, getInline, cleanup } = setupHandlers()
    const handlers = getHandlers()

    act(() => {
      handlers.handleStartNewFolder()
    })
    await waitFor(() => {
      const inline = getInline()
      expect(inline.mode).toBe("new-folder")
      expect(inline.parentPath).toBe("/")
    })

    act(() => {
      useInlineEditStore.setState({ mode: null, targetPath: null, parentPath: null })
      handlers.handleStartNewFile()
    })

    await waitFor(() => {
      const inline = getInline()
      expect(inline.mode).toBe("new-file")
      expect(inline.parentPath).toBe("/")
    })

    cleanup()
  })

  it("handlePaste with many items calls onStartCopyWithProgress", async () => {
    const onStartCopyWithProgress = vi.fn()
    const { getHandlers, cleanup } = setupHandlers({ onStartCopyWithProgress })
    const handlers = getHandlers()

    act(() => {
      useClipboardStore.setState({ paths: ["a", "b", "c", "d", "e", "f"], action: "copy" })
    })

    act(() => {
      handlers.handlePaste()
    })

    expect(onStartCopyWithProgress).toHaveBeenCalled()

    cleanup()
  })

  it("handlePaste with conflict prompts confirm and aborts when canceled", async () => {
    const copyEntries = vi.fn()
    const moveEntries = vi.fn()
    // make a conflict by keeping file1.txt name in files
    // Stub confirm store open behavior to simulate user cancel
    const confirmStore = useConfirmStore
    const originalOpen = confirmStore.getState().open
    const openStub = vi.fn(async () => false)
    act(() => {
      confirmStore.setState({ open: openStub })
    })

    const { getHandlers, cleanup } = setupHandlers({ copyEntries, moveEntries })
    const handlers = getHandlers()

    act(() => {
      useClipboardStore.setState({ paths: ["/some/path/file1.txt"], action: "copy" })
    })

    await act(async () => {
      await handlers.handlePaste()
    })

    expect(copyEntries).not.toHaveBeenCalled()
    expect(moveEntries).not.toHaveBeenCalled()

    // restore default open
    act(() => {
      confirmStore.setState({ open: originalOpen })
    })

    cleanup()
  })

  it("handleSelect navigates into directory when single-click-open is enabled", async () => {
    // Make requestAnimationFrame synchronous for deterministic tests
    const raf = globalThis.requestAnimationFrame
    const stubRaf: typeof globalThis.requestAnimationFrame = (cb) => {
      cb(0)
      return 0
    }
    Object.defineProperty(globalThis, "requestAnimationFrame", {
      value: stubRaf,
      configurable: true,
    })

    // Ensure single click opens (disable doubleClickToOpen) for this test
    act(() => {
      useSettingsStore.getState().updateBehavior({ doubleClickToOpen: false })
    })

    const { getHandlers, cleanup } = setupHandlers()
    const handlers = getHandlers()

    act(() =>
      handlers.handleSelect("/dir1", {
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
      } as unknown as React.MouseEvent),
    )

    await waitFor(() => {
      expect(useNavigationStore.getState().currentPath).toBe("/dir1")
    })

    // restore
    Object.defineProperty(globalThis, "requestAnimationFrame", {
      value: raf,
      configurable: true,
    })

    cleanup()
  })
})
