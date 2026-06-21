import { act } from "react"
import { toast, useToastStore } from "../store"

describe("toast store coverage", () => {
  beforeEach(() => {
    act(() => useToastStore.getState().clearAll())
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("adds and removes toasts via store", () => {
    const id = useToastStore.getState().addToast({ message: "hello", type: "info" })
    expect(useToastStore.getState().toasts).toHaveLength(1)
    act(() => useToastStore.getState().removeToast(id))
    expect(useToastStore.getState().toasts).toHaveLength(0)
  })

  it("exposes convenience helpers for all toast types", () => {
    toast.info("i")
    toast.success("s")
    toast.warning("w")
    toast.error("e")
    expect(useToastStore.getState().toasts).toHaveLength(4)

    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(useToastStore.getState().toasts).toHaveLength(0)
  })

  it("keeps persistent toasts when duration is zero", () => {
    toast.error("stay", 0)
    act(() => vi.advanceTimersByTime(5000))
    expect(useToastStore.getState().toasts).toHaveLength(1)
    act(() => useToastStore.getState().clearAll())
    expect(useToastStore.getState().toasts).toHaveLength(0)
  })
})
