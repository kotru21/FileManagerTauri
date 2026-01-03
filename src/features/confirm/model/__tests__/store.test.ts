import { act } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { useConfirmStore } from "../store"

describe("useConfirmStore", () => {
  const reset = () => {
    act(() => {
      useConfirmStore.setState({
        isOpen: false,
        title: undefined,
        message: undefined,
        onConfirm: null,
      })
    })
  }

  it("open sets state and confirm resolves true", async () => {
    reset()

    const promise = useConfirmStore.getState().open("T", "M")

    expect(useConfirmStore.getState().isOpen).toBe(true)
    expect(useConfirmStore.getState().title).toBe("T")
    expect(useConfirmStore.getState().message).toBe("M")

    act(() => {
      useConfirmStore.getState().confirm()
    })

    await expect(promise).resolves.toBe(true)
    expect(useConfirmStore.getState().isOpen).toBe(false)
    expect(useConfirmStore.getState().onConfirm).toBeNull()
  })

  it("cancel resolves false", async () => {
    reset()

    const promise = useConfirmStore.getState().open("T", "M")

    act(() => {
      useConfirmStore.getState().cancel()
    })

    await expect(promise).resolves.toBe(false)
    expect(useConfirmStore.getState().isOpen).toBe(false)
  })

  it("close resolves false", async () => {
    reset()

    const promise = useConfirmStore.getState().open("T", "M")

    act(() => {
      useConfirmStore.getState().close()
    })

    await expect(promise).resolves.toBe(false)
    expect(useConfirmStore.getState().isOpen).toBe(false)
  })
})
