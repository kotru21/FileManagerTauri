import { act } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { useDeleteConfirmStore } from "../store"

describe("useDeleteConfirmStore", () => {
  const reset = () => {
    act(() => {
      useDeleteConfirmStore.setState({
        isOpen: false,
        paths: [],
        onConfirm: null,
      })
    })
  }

  it("open sets state and confirm resolves true", async () => {
    reset()

    const promise = useDeleteConfirmStore.getState().open(["/a", "/b"])

    expect(useDeleteConfirmStore.getState().isOpen).toBe(true)
    expect(useDeleteConfirmStore.getState().paths).toEqual(["/a", "/b"])

    act(() => {
      useDeleteConfirmStore.getState().confirm()
    })

    await expect(promise).resolves.toBe(true)
    expect(useDeleteConfirmStore.getState().isOpen).toBe(false)
    expect(useDeleteConfirmStore.getState().paths).toEqual([])
    expect(useDeleteConfirmStore.getState().onConfirm).toBeNull()
  })

  it("cancel resolves false", async () => {
    reset()

    const promise = useDeleteConfirmStore.getState().open(["/a"])

    act(() => {
      useDeleteConfirmStore.getState().cancel()
    })

    await expect(promise).resolves.toBe(false)
    expect(useDeleteConfirmStore.getState().isOpen).toBe(false)
  })

  it("close resolves false", async () => {
    reset()

    const promise = useDeleteConfirmStore.getState().open(["/a"])

    act(() => {
      useDeleteConfirmStore.getState().close()
    })

    await expect(promise).resolves.toBe(false)
    expect(useDeleteConfirmStore.getState().isOpen).toBe(false)
  })
})
