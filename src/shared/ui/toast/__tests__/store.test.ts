import { act } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { toast, useToastStore } from "../store"

describe("useToastStore", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    act(() => {
      useToastStore.getState().clearAll()
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    act(() => {
      useToastStore.getState().clearAll()
    })
  })

  describe("addToast", () => {
    it("should add a toast", () => {
      act(() => {
        useToastStore.getState().addToast({
          message: "Test message",
          type: "info",
        })
      })

      const { toasts } = useToastStore.getState()
      expect(toasts).toHaveLength(1)
      expect(toasts[0].message).toBe("Test message")
      expect(toasts[0].type).toBe("info")
    })

    it("should generate unique id", () => {
      act(() => {
        useToastStore.getState().addToast({ message: "Toast 1", type: "info" })
        useToastStore.getState().addToast({ message: "Toast 2", type: "info" })
      })

      const { toasts } = useToastStore.getState()
      expect(toasts[0].id).not.toBe(toasts[1].id)
    })

    it("should return toast id", () => {
      let id: string | undefined
      act(() => {
        id = useToastStore.getState().addToast({
          message: "Test",
          type: "success",
        })
      })

      expect(id).toBeDefined()
      if (!id) throw new Error("toast id was not returned")
      expect(typeof id).toBe("string")
    })

    it("should auto-remove toast after duration", () => {
      act(() => {
        useToastStore.getState().addToast({
          message: "Test",
          type: "info",
          duration: 3000,
        })
      })

      expect(useToastStore.getState().toasts).toHaveLength(1)

      act(() => {
        vi.advanceTimersByTime(3000)
      })

      expect(useToastStore.getState().toasts).toHaveLength(0)
    })

    it("should use default duration if not specified", () => {
      act(() => {
        useToastStore.getState().addToast({
          message: "Test",
          type: "info",
        })
      })

      expect(useToastStore.getState().toasts).toHaveLength(1)

      // Default duration should be around 5000ms
      act(() => {
        vi.advanceTimersByTime(5000)
      })

      expect(useToastStore.getState().toasts).toHaveLength(0)
    })
  })

  describe("removeToast", () => {
    it("should remove toast by id", () => {
      let id: string | undefined
      act(() => {
        id = useToastStore.getState().addToast({
          message: "Test",
          type: "info",
        })
      })

      if (!id) throw new Error("toast id was not returned")

      const idStr = id

      act(() => {
        useToastStore.getState().removeToast(idStr)
      })

      expect(useToastStore.getState().toasts).toHaveLength(0)
    })

    it("should not throw for non-existent id", () => {
      expect(() => {
        act(() => {
          useToastStore.getState().removeToast("non-existent")
        })
      }).not.toThrow()
    })

    it("should only remove specified toast", () => {
      act(() => {
        useToastStore.getState().addToast({ message: "Toast 1", type: "info" })
        useToastStore.getState().addToast({ message: "Toast 2", type: "info" })
      })

      const id = useToastStore.getState().toasts[0].id

      act(() => {
        useToastStore.getState().removeToast(id)
      })

      const { toasts } = useToastStore.getState()
      expect(toasts).toHaveLength(1)
      expect(toasts[0].message).toBe("Toast 2")
    })
  })

  describe("clearAll", () => {
    it("should remove all toasts", () => {
      act(() => {
        useToastStore.getState().addToast({ message: "Toast 1", type: "info" })
        useToastStore.getState().addToast({ message: "Toast 2", type: "success" })
        useToastStore.getState().addToast({ message: "Toast 3", type: "error" })
      })

      expect(useToastStore.getState().toasts).toHaveLength(3)

      act(() => {
        useToastStore.getState().clearAll()
      })

      expect(useToastStore.getState().toasts).toHaveLength(0)
    })
  })

  describe("toast helpers", () => {
    it("toast.info should create info toast", () => {
      act(() => {
        toast.info("Info message")
      })

      const { toasts } = useToastStore.getState()
      expect(toasts[0].type).toBe("info")
      expect(toasts[0].message).toBe("Info message")
    })

    it("toast.success should create success toast", () => {
      act(() => {
        toast.success("Success message")
      })

      const { toasts } = useToastStore.getState()
      expect(toasts[0].type).toBe("success")
    })

    it("toast.warning should create warning toast", () => {
      act(() => {
        toast.warning("Warning message")
      })

      const { toasts } = useToastStore.getState()
      expect(toasts[0].type).toBe("warning")
    })

    it("toast.error should create error toast", () => {
      act(() => {
        toast.error("Error message")
      })

      const { toasts } = useToastStore.getState()
      expect(toasts[0].type).toBe("error")
    })
  })
})
