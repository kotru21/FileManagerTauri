import { act } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { useQuickFilterStore } from "../store"

describe("useQuickFilterStore", () => {
  const reset = () => {
    act(() => {
      useQuickFilterStore.setState({ filter: "", isActive: false })
    })
  }

  it("has expected initial state", () => {
    reset()
    const s = useQuickFilterStore.getState()
    expect(s.filter).toBe("")
    expect(s.isActive).toBe(false)
  })

  it("setFilter updates filter", () => {
    reset()

    act(() => {
      useQuickFilterStore.getState().setFilter("abc")
    })

    expect(useQuickFilterStore.getState().filter).toBe("abc")
  })

  it("activate/deactivate toggles active and clears filter on deactivate", () => {
    reset()

    act(() => {
      useQuickFilterStore.getState().setFilter("abc")
      useQuickFilterStore.getState().activate()
    })

    expect(useQuickFilterStore.getState().isActive).toBe(true)
    expect(useQuickFilterStore.getState().filter).toBe("abc")

    act(() => {
      useQuickFilterStore.getState().deactivate()
    })

    expect(useQuickFilterStore.getState().isActive).toBe(false)
    expect(useQuickFilterStore.getState().filter).toBe("")
  })

  it("clear clears filter without changing active flag", () => {
    reset()

    act(() => {
      useQuickFilterStore.getState().activate()
      useQuickFilterStore.getState().setFilter("abc")
      useQuickFilterStore.getState().clear()
    })

    expect(useQuickFilterStore.getState().isActive).toBe(true)
    expect(useQuickFilterStore.getState().filter).toBe("")
  })

  it("toggle activates when inactive; deactivates and clears when active", () => {
    reset()

    act(() => {
      useQuickFilterStore.getState().toggle()
    })

    expect(useQuickFilterStore.getState().isActive).toBe(true)

    act(() => {
      useQuickFilterStore.getState().setFilter("abc")
      useQuickFilterStore.getState().toggle()
    })

    expect(useQuickFilterStore.getState().isActive).toBe(false)
    expect(useQuickFilterStore.getState().filter).toBe("")
  })
})
