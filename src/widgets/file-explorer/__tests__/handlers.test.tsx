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

function setupHandlers(overrides?: Partial<Record<string, any>>) {
  // Reset stores without reading internals
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

    // Return a stable primitive snapshot: mode|parent|target
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
        /* ignore */
      }
      try {
        root?.unmount()
      } catch {
        /* ignore */
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
    confirmStore.setState({ open: openStub })

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
    confirmStore.setState({ open: originalOpen })

    cleanup()
  })
})
