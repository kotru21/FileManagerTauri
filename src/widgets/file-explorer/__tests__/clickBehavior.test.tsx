/// <reference types="vitest" />

import { act, cleanup, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { useSelectionStore } from "@/features/file-selection"
import { useNavigationStore } from "@/features/navigation"
import { useSettingsStore } from "@/features/settings"
import { useTabsStore } from "@/features/tabs"
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
  act(() => {
    useSelectionStore.getState().clearSelection()
    useNavigationStore.getState().navigate("/")
  })

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
    const selectedStr = useSelectionStore((s) => Array.from(s.selectedPaths).join(","))
    const current = useNavigationStore((s) => s.currentPath ?? "")

    return (
      <div>
        <div data-testid="selected">{selectedStr}</div>
        <div data-testid="current">{current}</div>
      </div>
    )
  }

  let root: ReturnType<typeof render> | undefined
  act(() => {
    root = render(<TestComp />)
  })

  return {
    getHandlers: () => handlers,
    getSelected: () => {
      const s = screen.getByTestId("selected").textContent || ""
      return s.length > 0 ? s.split(",") : []
    },
    getCurrent: () => screen.getByTestId("current").textContent || "",
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

describe("click behavior", () => {
  it("doubleClickToOpen=true -> single click selects, does not navigate", async () => {
    act(() =>
      useSettingsStore
        .getState()
        .updateBehavior({ doubleClickToOpen: true, singleClickToSelect: true }),
    )

    const { getHandlers, getSelected, getCurrent, cleanup } = setupHandlers()
    const handlers = getHandlers()

    act(() =>
      handlers.handleSelect("/dir1", {
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
      } as unknown as React.MouseEvent),
    )

    await waitFor(() => {
      expect(getSelected()).toEqual(["/dir1"])
      expect(getCurrent()).not.toBe("/dir1")
    })

    cleanup()
  })

  it("doubleClickToOpen=false + singleClickToSelect=true -> single click selects and navigates", async () => {
    act(() =>
      useSettingsStore
        .getState()
        .updateBehavior({ doubleClickToOpen: false, singleClickToSelect: true }),
    )

    const { getHandlers, getSelected, getCurrent, cleanup } = setupHandlers()
    const handlers = getHandlers()

    act(() =>
      handlers.handleSelect("/dir1", {
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
      } as unknown as React.MouseEvent),
    )

    // allow requestAnimationFrame
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20))
    })

    await waitFor(() => {
      expect(getSelected()).toEqual(["/dir1"])
      expect(getCurrent()).toBe("/dir1")
    })

    cleanup()
  })

  it("doubleClickToOpen=false + singleClickToSelect=false -> single click opens but does not select", async () => {
    act(() =>
      useSettingsStore
        .getState()
        .updateBehavior({ doubleClickToOpen: false, singleClickToSelect: false }),
    )

    const { getHandlers, getSelected, getCurrent, cleanup } = setupHandlers()
    const handlers = getHandlers()

    act(() =>
      handlers.handleSelect("/dir1", {
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
      } as unknown as React.MouseEvent),
    )

    // allow requestAnimationFrame
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20))
    })

    await waitFor(() => {
      expect(getSelected()).toEqual([])
      expect(getCurrent()).toBe("/dir1")
    })

    cleanup()
  })

  it("Ctrl+Click opens folder in new tab when setting enabled", async () => {
    act(() =>
      useSettingsStore.getState().updateBehavior({
        doubleClickToOpen: false,
        singleClickToSelect: false,
        openFoldersInNewTab: true,
      }),
    )

    // reset tabs
    act(() => {
      useTabsStore.setState({ tabs: [], activeTabId: null })
    })

    const { getHandlers, getCurrent, cleanup } = setupHandlers()
    const handlers = getHandlers()

    act(() =>
      handlers.handleSelect("/dir1", {
        ctrlKey: true,
        metaKey: false,
        shiftKey: false,
      } as unknown as React.MouseEvent),
    )

    // allow requestAnimationFrame
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20))
    })

    await waitFor(() => {
      expect(getCurrent()).toBe("/dir1")
      const tabs = useTabsStore.getState().tabs
      expect(tabs.some((t) => t.path === "/dir1")).toBeTruthy()
    })

    cleanup()
  })

  it("right-click selects item but does not navigate when singleClickToSelect=false", async () => {
    act(() =>
      useSettingsStore
        .getState()
        .updateBehavior({ doubleClickToOpen: false, singleClickToSelect: false }),
    )

    const { getHandlers, getSelected, getCurrent, cleanup } = setupHandlers()
    const handlers = getHandlers()

    act(() =>
      handlers.handleSelect("/dir1", {
        type: "contextmenu",
        button: 2,
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
      } as unknown as React.MouseEvent),
    )

    // allow microtask
    await act(async () => {
      await new Promise((r) => setTimeout(r, 5))
    })

    await waitFor(() => {
      expect(getSelected()).toEqual(["/dir1"])
      expect(getCurrent()).not.toBe("/dir1")
    })

    cleanup()
  })

  it("right-click selects item but does not navigate when singleClickToSelect=true", async () => {
    act(() =>
      useSettingsStore
        .getState()
        .updateBehavior({ doubleClickToOpen: false, singleClickToSelect: true }),
    )

    const { getHandlers, getSelected, getCurrent, cleanup } = setupHandlers()
    const handlers = getHandlers()

    act(() =>
      handlers.handleSelect("/dir1", {
        type: "contextmenu",
        button: 2,
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
      } as unknown as React.MouseEvent),
    )

    // allow microtask
    await act(async () => {
      await new Promise((r) => setTimeout(r, 5))
    })

    await waitFor(() => {
      expect(getSelected()).toEqual(["/dir1"])
      expect(getCurrent()).not.toBe("/dir1")
    })

    cleanup()
  })
})
