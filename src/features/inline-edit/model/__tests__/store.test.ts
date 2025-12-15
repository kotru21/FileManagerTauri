import { act } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { useInlineEditStore } from "../store"

describe("useInlineEditStore", () => {
  beforeEach(() => {
    act(() => {
      useInlineEditStore.getState().reset()
    })
  })

  afterEach(() => {
    act(() => {
      useInlineEditStore.getState().reset()
    })
  })

  describe("initial state", () => {
    it("should have null mode", () => {
      expect(useInlineEditStore.getState().mode).toBeNull()
    })

    it("should have null targetPath", () => {
      expect(useInlineEditStore.getState().targetPath).toBeNull()
    })

    it("should have null parentPath", () => {
      expect(useInlineEditStore.getState().parentPath).toBeNull()
    })
  })

  describe("startNewFolder", () => {
    it("should set mode to new-folder", () => {
      act(() => {
        useInlineEditStore.getState().startNewFolder("/home/user")
      })

      expect(useInlineEditStore.getState().mode).toBe("new-folder")
    })

    it("should set parentPath", () => {
      act(() => {
        useInlineEditStore.getState().startNewFolder("/home/user")
      })

      expect(useInlineEditStore.getState().parentPath).toBe("/home/user")
    })

    it("should clear targetPath", () => {
      act(() => {
        useInlineEditStore.getState().startRename("/home/user/file.txt")
        useInlineEditStore.getState().startNewFolder("/home/user")
      })

      expect(useInlineEditStore.getState().targetPath).toBeNull()
    })
  })

  describe("startNewFile", () => {
    it("should set mode to new-file", () => {
      act(() => {
        useInlineEditStore.getState().startNewFile("/home/user")
      })

      expect(useInlineEditStore.getState().mode).toBe("new-file")
    })

    it("should set parentPath", () => {
      act(() => {
        useInlineEditStore.getState().startNewFile("/documents")
      })

      expect(useInlineEditStore.getState().parentPath).toBe("/documents")
    })
  })

  describe("startRename", () => {
    it("should set mode to rename", () => {
      act(() => {
        useInlineEditStore.getState().startRename("/home/user/file.txt")
      })

      expect(useInlineEditStore.getState().mode).toBe("rename")
    })

    it("should set targetPath", () => {
      act(() => {
        useInlineEditStore.getState().startRename("/home/user/file.txt")
      })

      expect(useInlineEditStore.getState().targetPath).toBe("/home/user/file.txt")
    })

    it("should clear parentPath", () => {
      act(() => {
        useInlineEditStore.getState().startNewFolder("/home/user")
        useInlineEditStore.getState().startRename("/home/user/file.txt")
      })

      expect(useInlineEditStore.getState().parentPath).toBeNull()
    })
  })

  describe("cancel", () => {
    it("should reset mode to null", () => {
      act(() => {
        useInlineEditStore.getState().startNewFolder("/home/user")
        useInlineEditStore.getState().cancel()
      })

      expect(useInlineEditStore.getState().mode).toBeNull()
    })

    it("should reset targetPath", () => {
      act(() => {
        useInlineEditStore.getState().startRename("/file.txt")
        useInlineEditStore.getState().cancel()
      })

      expect(useInlineEditStore.getState().targetPath).toBeNull()
    })

    it("should reset parentPath", () => {
      act(() => {
        useInlineEditStore.getState().startNewFolder("/home")
        useInlineEditStore.getState().cancel()
      })

      expect(useInlineEditStore.getState().parentPath).toBeNull()
    })
  })

  describe("reset", () => {
    it("should reset all state", () => {
      act(() => {
        useInlineEditStore.getState().startRename("/file.txt")
        useInlineEditStore.getState().reset()
      })

      const state = useInlineEditStore.getState()
      expect(state.mode).toBeNull()
      expect(state.targetPath).toBeNull()
      expect(state.parentPath).toBeNull()
    })
  })

  describe("mode transitions", () => {
    it("should allow switching from new-folder to rename", () => {
      act(() => {
        useInlineEditStore.getState().startNewFolder("/home")
        useInlineEditStore.getState().startRename("/file.txt")
      })

      const state = useInlineEditStore.getState()
      expect(state.mode).toBe("rename")
      expect(state.targetPath).toBe("/file.txt")
      expect(state.parentPath).toBeNull()
    })

    it("should allow switching from rename to new-file", () => {
      act(() => {
        useInlineEditStore.getState().startRename("/file.txt")
        useInlineEditStore.getState().startNewFile("/home")
      })

      const state = useInlineEditStore.getState()
      expect(state.mode).toBe("new-file")
      expect(state.parentPath).toBe("/home")
      expect(state.targetPath).toBeNull()
    })
  })
})
