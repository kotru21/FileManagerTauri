/// <reference types="vitest" />

import { act, cleanup, render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { useSelectionStore } from "@/features/file-selection"
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

function setupHandlers() {
  useSelectionStore.getState().clearSelection()
  useNavigationStore.getState().navigate("/")

  let handlers!: ReturnType<typeof useFileExplorerHandlers>

  function TestComp() {
    const h = useFileExplorerHandlers({
      files,
      createDirectory: async () => {},
      createFile: async () => {},
      renameEntry: async () => {},
      deleteEntries: async () => {},
      copyEntries: async () => {},
      moveEntries: async () => {},
      onStartCopyWithProgress: () => {},
    })
    handlers = h
    return null
  }

  let root: ReturnType<typeof render> | undefined
  act(() => {
    root = render(<TestComp />)
  })

  return {
    getHandlers: () => handlers,
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

describe("click behavior", () => {
  it("doubleClickToOpen=true -> single click selects, does not navigate", () => {
    act(() =>
      useSettingsStore
        .getState()
        .updateBehavior({ doubleClickToOpen: true, singleClickToSelect: true }),
    )

    const { getHandlers, cleanup } = setupHandlers()
    const handlers = getHandlers()

    act(() =>
      handlers.handleSelect("/dir1", {
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
      } as unknown as React.MouseEvent),
    )

    expect(useSelectionStore.getState().getSelectedPaths()).toEqual(["/dir1"])
    expect(useNavigationStore.getState().currentPath).not.toBe("/dir1")

    cleanup()
  })

  it("doubleClickToOpen=false + singleClickToSelect=true -> single click selects and navigates", async () => {
    act(() =>
      useSettingsStore
        .getState()
        .updateBehavior({ doubleClickToOpen: false, singleClickToSelect: true }),
    )

    const { getHandlers, cleanup } = setupHandlers()
    const handlers = getHandlers()

    act(() =>
      handlers.handleSelect("/dir1", {
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
      } as unknown as React.MouseEvent),
    )

    // allow requestAnimationFrame
    await new Promise((r) => setTimeout(r, 20))

    expect(useSelectionStore.getState().getSelectedPaths()).toEqual(["/dir1"])
    expect(useNavigationStore.getState().currentPath).toBe("/dir1")

    cleanup()
  })

  it("doubleClickToOpen=false + singleClickToSelect=false -> single click opens but does not select", async () => {
    act(() =>
      useSettingsStore
        .getState()
        .updateBehavior({ doubleClickToOpen: false, singleClickToSelect: false }),
    )

    const { getHandlers, cleanup } = setupHandlers()
    const handlers = getHandlers()

    act(() =>
      handlers.handleSelect("/dir1", {
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
      } as unknown as React.MouseEvent),
    )

    // allow requestAnimationFrame
    await new Promise((r) => setTimeout(r, 20))

    expect(useSelectionStore.getState().getSelectedPaths()).toEqual([])
    expect(useNavigationStore.getState().currentPath).toBe("/dir1")

    cleanup()
  })
})
