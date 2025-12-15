import { act } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useNavigationStore } from "../store"

// Mock Tauri commands
vi.mock("@/shared/api/tauri", () => ({
  commands: {
    getParentPath: vi.fn(),
  },
}))

describe("useNavigationStore", () => {
  beforeEach(() => {
    // Reset store state
    act(() => {
      const store = useNavigationStore.getState()
      // Reset to initial state
      useNavigationStore.setState({
        currentPath: null,
        history: [],
        historyIndex: -1,
      })
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe("initial state", () => {
    it("should have null currentPath", () => {
      const { currentPath } = useNavigationStore.getState()
      expect(currentPath).toBeNull()
    })

    it("should have empty history", () => {
      const { history } = useNavigationStore.getState()
      expect(history).toEqual([])
    })

    it("should not be able to go back", () => {
      expect(useNavigationStore.getState().canGoBack()).toBe(false)
    })

    it("should not be able to go forward", () => {
      expect(useNavigationStore.getState().canGoForward()).toBe(false)
    })
  })

  describe("navigate", () => {
    it("should set currentPath", () => {
      act(() => {
        useNavigationStore.getState().navigate("/home/user")
      })

      expect(useNavigationStore.getState().currentPath).toBe("/home/user")
    })

    it("should add path to history", () => {
      act(() => {
        useNavigationStore.getState().navigate("/home/user")
      })

      const { history } = useNavigationStore.getState()
      expect(history).toContain("/home/user")
    })

    it("should update historyIndex", () => {
      act(() => {
        useNavigationStore.getState().navigate("/path1")
        useNavigationStore.getState().navigate("/path2")
      })

      const { historyIndex } = useNavigationStore.getState()
      expect(historyIndex).toBe(1)
    })

    it("should truncate forward history when navigating from middle", () => {
      act(() => {
        useNavigationStore.getState().navigate("/path1")
        useNavigationStore.getState().navigate("/path2")
        useNavigationStore.getState().navigate("/path3")
        useNavigationStore.getState().goBack()
        useNavigationStore.getState().goBack()
        useNavigationStore.getState().navigate("/new-path")
      })

      const { history } = useNavigationStore.getState()
      expect(history).toEqual(["/path1", "/new-path"])
    })

    it("should not duplicate same path", () => {
      act(() => {
        useNavigationStore.getState().navigate("/same/path")
        useNavigationStore.getState().navigate("/same/path")
      })

      const { history } = useNavigationStore.getState()
      expect(history.filter((p) => p === "/same/path")).toHaveLength(1)
    })
  })

  describe("goBack", () => {
    it("should go to previous path", () => {
      act(() => {
        useNavigationStore.getState().navigate("/path1")
        useNavigationStore.getState().navigate("/path2")
        useNavigationStore.getState().goBack()
      })

      expect(useNavigationStore.getState().currentPath).toBe("/path1")
    })

    it("should not go back past first entry", () => {
      act(() => {
        useNavigationStore.getState().navigate("/path1")
        useNavigationStore.getState().goBack()
        useNavigationStore.getState().goBack()
      })

      expect(useNavigationStore.getState().historyIndex).toBe(0)
    })

    it("should enable canGoForward after going back", () => {
      act(() => {
        useNavigationStore.getState().navigate("/path1")
        useNavigationStore.getState().navigate("/path2")
        useNavigationStore.getState().goBack()
      })

      expect(useNavigationStore.getState().canGoForward()).toBe(true)
    })
  })

  describe("goForward", () => {
    it("should go to next path in history", () => {
      act(() => {
        useNavigationStore.getState().navigate("/path1")
        useNavigationStore.getState().navigate("/path2")
        useNavigationStore.getState().goBack()
        useNavigationStore.getState().goForward()
      })

      expect(useNavigationStore.getState().currentPath).toBe("/path2")
    })

    it("should not go forward past last entry", () => {
      act(() => {
        useNavigationStore.getState().navigate("/path1")
        useNavigationStore.getState().goForward()
        useNavigationStore.getState().goForward()
      })

      expect(useNavigationStore.getState().historyIndex).toBe(0)
    })

    it("should disable canGoForward at end of history", () => {
      act(() => {
        useNavigationStore.getState().navigate("/path1")
        useNavigationStore.getState().navigate("/path2")
        useNavigationStore.getState().goBack()
        useNavigationStore.getState().goForward()
      })

      expect(useNavigationStore.getState().canGoForward()).toBe(false)
    })
  })

  describe("canGoBack", () => {
    it("should return false when at start of history", () => {
      act(() => {
        useNavigationStore.getState().navigate("/path1")
      })

      expect(useNavigationStore.getState().canGoBack()).toBe(false)
    })

    it("should return true when not at start", () => {
      act(() => {
        useNavigationStore.getState().navigate("/path1")
        useNavigationStore.getState().navigate("/path2")
      })

      expect(useNavigationStore.getState().canGoBack()).toBe(true)
    })
  })

  describe("canGoForward", () => {
    it("should return false when at end of history", () => {
      act(() => {
        useNavigationStore.getState().navigate("/path1")
        useNavigationStore.getState().navigate("/path2")
      })

      expect(useNavigationStore.getState().canGoForward()).toBe(false)
    })

    it("should return true when not at end", () => {
      act(() => {
        useNavigationStore.getState().navigate("/path1")
        useNavigationStore.getState().navigate("/path2")
        useNavigationStore.getState().goBack()
      })

      expect(useNavigationStore.getState().canGoForward()).toBe(true)
    })
  })
})