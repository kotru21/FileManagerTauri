import { act } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import type { Command } from "../store"
import { useCommandPaletteStore } from "../store"

describe("useCommandPaletteStore", () => {
  const cmd = (overrides: Partial<Command> = {}): Command => ({
    id: overrides.id ?? "cmd-1",
    title: overrides.title ?? "Open",
    description: overrides.description,
    shortcut: overrides.shortcut,
    icon: overrides.icon,
    category: overrides.category ?? "navigation",
    action: overrides.action ?? vi.fn(),
    keywords: overrides.keywords,
  })

  const reset = () => {
    act(() => {
      useCommandPaletteStore.setState({
        isOpen: false,
        search: "",
        commands: [],
        selectedIndex: 0,
      })
    })
  }

  it("has expected initial state", () => {
    reset()
    const s = useCommandPaletteStore.getState()

    expect(s.isOpen).toBe(false)
    expect(s.search).toBe("")
    expect(s.commands).toEqual([])
    expect(s.selectedIndex).toBe(0)
  })

  it("open/close/toggle resets search and selectedIndex", () => {
    reset()

    act(() => {
      useCommandPaletteStore.getState().setSearch("abc")
      useCommandPaletteStore.getState().setSelectedIndex(5)
      useCommandPaletteStore.getState().open()
    })

    expect(useCommandPaletteStore.getState().isOpen).toBe(true)
    expect(useCommandPaletteStore.getState().search).toBe("")
    expect(useCommandPaletteStore.getState().selectedIndex).toBe(0)

    act(() => {
      useCommandPaletteStore.getState().toggle()
    })

    expect(useCommandPaletteStore.getState().isOpen).toBe(false)
    expect(useCommandPaletteStore.getState().search).toBe("")
    expect(useCommandPaletteStore.getState().selectedIndex).toBe(0)

    act(() => {
      useCommandPaletteStore.getState().toggle()
    })

    expect(useCommandPaletteStore.getState().isOpen).toBe(true)
  })

  it("registerCommands deduplicates by id and keeps latest", () => {
    reset()

    const a1 = cmd({ id: "a", title: "A1" })
    const a2 = cmd({ id: "a", title: "A2" })
    const b = cmd({ id: "b", title: "B" })

    act(() => {
      useCommandPaletteStore.getState().registerCommands([a1, b])
      useCommandPaletteStore.getState().registerCommands([a2])
    })

    const titles = useCommandPaletteStore.getState().commands.map((c) => c.title)
    expect(titles).toEqual(["B", "A2"])
  })

  it("unregisterCommands removes by id", () => {
    reset()

    act(() => {
      useCommandPaletteStore.getState().registerCommands([cmd({ id: "a" }), cmd({ id: "b" })])
      useCommandPaletteStore.getState().unregisterCommands(["a"])
    })

    expect(useCommandPaletteStore.getState().commands.map((c) => c.id)).toEqual(["b"])
  })

  it("executeCommand closes palette and runs action", () => {
    reset()

    const action = vi.fn()
    act(() => {
      useCommandPaletteStore.getState().registerCommands([cmd({ id: "run", action })])
      useCommandPaletteStore.getState().open()
    })

    act(() => {
      useCommandPaletteStore.getState().executeCommand("run")
    })

    expect(action).toHaveBeenCalledTimes(1)
    expect(useCommandPaletteStore.getState().isOpen).toBe(false)
  })

  it("executeCommand is no-op for unknown id", () => {
    reset()

    act(() => {
      useCommandPaletteStore.getState().registerCommands([cmd({ id: "a" })])
      useCommandPaletteStore.getState().open()
      useCommandPaletteStore.getState().executeCommand("missing")
    })

    expect(useCommandPaletteStore.getState().isOpen).toBe(true)
  })

  it("getFilteredCommands filters across title/description/category/keywords and prioritizes title matches", () => {
    reset()

    const titleMatch = cmd({
      id: "t",
      title: "Search in files",
      description: "Find text",
      category: "search",
      keywords: ["grep"],
    })

    const descMatch = cmd({
      id: "d",
      title: "Open settings",
      description: "Search options",
      category: "other",
    })

    act(() => {
      useCommandPaletteStore.getState().registerCommands([descMatch, titleMatch])
      useCommandPaletteStore.getState().setSearch("search")
    })

    const filtered = useCommandPaletteStore.getState().getFilteredCommands()
    expect(filtered.map((c) => c.id)).toEqual(["t", "d"])
  })
})
