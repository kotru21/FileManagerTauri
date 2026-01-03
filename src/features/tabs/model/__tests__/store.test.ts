import { act } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { useTabsStore } from "../store"

describe("useTabsStore", () => {
  beforeEach(() => {
    // Ensure deterministic ids
    let n = 0
    vi.stubGlobal("crypto", {
      randomUUID: () => `uuid-${++n}`,
    } as unknown as Crypto)

    act(() => {
      useTabsStore.setState({
        tabs: [],
        activeTabId: null,
      })
    })
  })

  it("addTab creates tab, sets active, derives title from path", () => {
    act(() => {
      useTabsStore.getState().addTab("/a/b/")
    })

    const s = useTabsStore.getState()
    expect(s.tabs).toHaveLength(1)
    expect(s.activeTabId).toBe(s.tabs[0].id)
    expect(s.tabs[0].title).toBe("b")
  })

  it("addTab can use provided title", () => {
    const id = useTabsStore.getState().addTab("/x", "Custom")
    expect(useTabsStore.getState().getTabById(id)?.title).toBe("Custom")
  })

  it("closeTab does nothing for pinned tabs", () => {
    const id = useTabsStore.getState().addTab("/a")

    act(() => {
      useTabsStore.getState().pinTab(id)
      useTabsStore.getState().closeTab(id)
    })

    expect(useTabsStore.getState().tabs.map((t) => t.id)).toEqual([id])
  })

  it("closeTab updates active to adjacent when closing active", () => {
    const id1 = useTabsStore.getState().addTab("/a")
    const id2 = useTabsStore.getState().addTab("/b")
    const id3 = useTabsStore.getState().addTab("/c")

    expect(useTabsStore.getState().activeTabId).toBe(id3)

    act(() => {
      useTabsStore.getState().closeTab(id3)
    })

    expect(useTabsStore.getState().tabs.map((t) => t.id)).toEqual([id1, id2])
    expect(useTabsStore.getState().activeTabId).toBe(id2)
  })

  it("closeOtherTabs keeps pinned and sets active to provided id", () => {
    const a = useTabsStore.getState().addTab("/a")
    const b = useTabsStore.getState().addTab("/b")
    const c = useTabsStore.getState().addTab("/c")

    act(() => {
      useTabsStore.getState().pinTab(a)
      useTabsStore.getState().closeOtherTabs(b)
    })

    const ids = useTabsStore.getState().tabs.map((t) => t.id)
    expect(ids).toContain(a)
    expect(ids).toContain(b)
    expect(ids).not.toContain(c)
    expect(useTabsStore.getState().activeTabId).toBe(b)
  })

  it("closeAllTabs keeps pinned and activates first pinned", () => {
    const a = useTabsStore.getState().addTab("/a")
    useTabsStore.getState().addTab("/b")

    act(() => {
      useTabsStore.getState().pinTab(a)
      useTabsStore.getState().closeAllTabs()
    })

    expect(useTabsStore.getState().tabs.map((t) => t.id)).toEqual([a])
    expect(useTabsStore.getState().activeTabId).toBe(a)

    // unpinned-only case
    act(() => {
      useTabsStore.setState({ tabs: [], activeTabId: null })
    })

    useTabsStore.getState().addTab("/x")
    act(() => {
      useTabsStore.getState().closeAllTabs()
    })

    expect(useTabsStore.getState().tabs).toEqual([])
    expect(useTabsStore.getState().activeTabId).toBeNull()
  })

  it("moveTab reorders tabs", () => {
    const a = useTabsStore.getState().addTab("/a")
    const b = useTabsStore.getState().addTab("/b")
    const c = useTabsStore.getState().addTab("/c")

    act(() => {
      useTabsStore.getState().moveTab(2, 0)
    })

    expect(useTabsStore.getState().tabs.map((t) => t.id)).toEqual([c, a, b])
  })

  it("duplicateTab inserts copy next to original and activates it", () => {
    const a = useTabsStore.getState().addTab("C:\\A\\")

    const dupId = useTabsStore.getState().duplicateTab(a)

    const s = useTabsStore.getState()
    expect(dupId).not.toBe("")
    expect(s.activeTabId).toBe(dupId)

    const idx = s.tabs.findIndex((t) => t.id === a)
    expect(s.tabs[idx + 1].id).toBe(dupId)
    expect(s.tabs[idx + 1].isPinned).toBe(false)
    expect(s.tabs[idx + 1].title).toBe("A")
  })

  it("pinTab sets pinned and moves pinned tabs to the front", () => {
    const a = useTabsStore.getState().addTab("/a")
    const b = useTabsStore.getState().addTab("/b")

    act(() => {
      useTabsStore.getState().pinTab(b)
    })

    const s = useTabsStore.getState()
    expect(s.tabs[0].id).toBe(b)
    expect(s.tabs[0].isPinned).toBe(true)
    expect(s.tabs[1].id).toBe(a)
  })

  it("getActiveTab returns active tab; getTabById returns tab", () => {
    const a = useTabsStore.getState().addTab("/a")

    expect(useTabsStore.getState().getActiveTab()?.id).toBe(a)
    expect(useTabsStore.getState().getTabById(a)?.path).toBe("/a")
  })
})
