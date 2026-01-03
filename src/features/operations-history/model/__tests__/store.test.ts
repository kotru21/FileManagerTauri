import { act } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { createOperationDescription, useOperationsHistoryStore } from "../store"

describe("useOperationsHistoryStore basics", () => {
  const reset = () => {
    act(() => {
      useOperationsHistoryStore.setState({ operations: [], maxHistory: 3, isUndoing: false })
    })
  }

  it("addOperation prepends, stamps timestamp and respects maxHistory", () => {
    reset()

    vi.spyOn(Date, "now").mockReturnValue(100)

    act(() => {
      useOperationsHistoryStore.getState().addOperation({
        type: "rename",
        description: "d1",
        data: { newPath: "/a/new", oldName: "old" },
        canUndo: true,
      })
      useOperationsHistoryStore.getState().addOperation({
        type: "create",
        description: "d2",
        data: { newPath: "/b" },
        canUndo: true,
      })
      useOperationsHistoryStore.getState().addOperation({
        type: "move",
        description: "d3",
        data: { sources: ["/a"], destination: "/d" },
        canUndo: true,
      })
      useOperationsHistoryStore.getState().addOperation({
        type: "delete",
        description: "d4",
        data: { deletedPaths: ["/x"] },
        canUndo: false,
      })
    })

    const ops = useOperationsHistoryStore.getState().operations
    expect(ops).toHaveLength(3)
    expect(ops[0].description).toBe("d4")
    expect(ops[0].timestamp).toBe(100)
    expect(ops[0].undone).toBe(false)
    expect(typeof ops[0].id).toBe("string")
    expect(ops[0].id.length).toBeGreaterThan(0)
  })

  it("getLastUndoableOperation returns first canUndo && !undone", () => {
    reset()

    act(() => {
      useOperationsHistoryStore.getState().addOperation({
        type: "delete",
        description: "no",
        data: { deletedPaths: ["/x"] },
        canUndo: false,
      })
      useOperationsHistoryStore.getState().addOperation({
        type: "rename",
        description: "yes",
        data: { newPath: "/a", oldName: "b" },
        canUndo: true,
      })
    })

    const op = useOperationsHistoryStore.getState().getLastUndoableOperation()
    expect(op?.description).toBe("yes")

    act(() => {
      useOperationsHistoryStore.setState((state) => ({
        operations: state.operations.map((o) => (o.id === op?.id ? { ...o, undone: true } : o)),
      }))
    })

    expect(useOperationsHistoryStore.getState().getLastUndoableOperation()).toBeNull()
  })

  it("clearHistory clears operations", () => {
    reset()

    act(() => {
      useOperationsHistoryStore.getState().addOperation({
        type: "create",
        description: "x",
        data: { newPath: "/a" },
        canUndo: true,
      })
      useOperationsHistoryStore.getState().clearHistory()
    })

    expect(useOperationsHistoryStore.getState().operations).toEqual([])
  })
})

describe("createOperationDescription", () => {
  it("formats strings for known operation types", () => {
    expect(
      createOperationDescription("copy", { sources: ["/a", "/b"], destination: "/dest" }),
    ).toContain("Копирование 2")

    expect(createOperationDescription("move", { sources: ["/a"], destination: "/dest" })).toContain(
      "Перемещение 1",
    )

    expect(createOperationDescription("delete", { deletedPaths: ["/a", "/b"] })).toContain(
      "Удаление 2",
    )

    expect(createOperationDescription("rename", { oldName: "a", newName: "b" })).toBe(
      'Переименование "a" в "b"',
    )

    expect(createOperationDescription("create", { newPath: "/x" })).toBe('Создание "/x"')
  })
})
