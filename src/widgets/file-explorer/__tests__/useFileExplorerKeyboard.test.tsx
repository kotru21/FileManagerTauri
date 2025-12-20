/// <reference types="vitest" />
import { act, render } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useNavigationStore } from "@/features/navigation"
import { useSettingsStore } from "@/features/settings"
import type { UseFileExplorerKeyboardOptions } from "../lib/useFileExplorerKeyboard"
import { useFileExplorerKeyboard } from "../lib/useFileExplorerKeyboard"

function setupComponent(overrides?: Partial<UseFileExplorerKeyboardOptions>) {
  const callbacks = {
    onCopy: vi.fn(),
    onCut: vi.fn(),
    onPaste: vi.fn(),
    onDelete: vi.fn(),
    onStartNewFolder: vi.fn(),
    onRefresh: vi.fn(),
    onQuickLook: vi.fn(),
    ...(overrides ?? {}),
  }

  function TestComp() {
    useFileExplorerKeyboard(callbacks)
    return <div data-testid="root" />
  }

  const r = render(<TestComp />)
  return { ...callbacks, ...r }
}

describe("useFileExplorerKeyboard normalization and matching", () => {
  beforeEach(() => {
    // reset navigation
    act(() => {
      useNavigationStore.setState({ currentPath: "/", history: ["/"], historyIndex: 0 })
      // set keyboard shortcuts to predictable set
      useSettingsStore.getState().updateKeyboard({
        shortcuts: [
          { id: "copy", action: "Копировать", keys: "Ctrl+C", enabled: true },
          { id: "refresh", action: "Обновить", keys: "F5", enabled: true },
          { id: "rename", action: "Переименовать", keys: "F2", enabled: true },
        ],
      })
    })
  })

  it("triggers copy on Ctrl+C", () => {
    const { onCopy } = setupComponent()

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "c", ctrlKey: true }))
    })

    expect(onCopy).toHaveBeenCalled()
  })

  it("triggers copy on Meta+C (Cmd on mac) via aliasing", () => {
    const { onCopy } = setupComponent()

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "c", metaKey: true }))
    })

    expect(onCopy).toHaveBeenCalled()
  })

  it("triggers refresh on F5 (case-insensitive)", () => {
    const { onRefresh } = setupComponent()

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "F5" }))
    })

    expect(onRefresh).toHaveBeenCalled()
  })

  it("triggers rename on F2", () => {
    const onStartRename = vi.fn()
    setupComponent({ onStartRename })

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "F2" }))
    })

    expect(onStartRename).toHaveBeenCalled()
  })

  it("handles Alt+ArrowLeft -> back navigation", () => {
    setupComponent()

    act(() => {
      useNavigationStore.getState().navigate("/")
      useNavigationStore.getState().navigate("/a")
    })

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", altKey: true }))
    })

    expect(useNavigationStore.getState().currentPath).toBe("/")
  })
})
