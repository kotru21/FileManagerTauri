/// <reference types="vitest" />
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/shared/api/tauri/client", () => {
  return {
    tauriClient: {
      renameEntry: vi.fn(),
      moveEntries: vi.fn(),
      deleteEntries: vi.fn(),
    },
  }
})

import { tauriClient } from "@/shared/api/tauri/client"
import { useOperationsHistoryStore } from "../store"

function resetOperationsStore() {
  useOperationsHistoryStore.setState({ operations: [], isUndoing: false })
}

describe("useOperationsHistoryStore.undoLastOperation", () => {
  beforeEach(() => {
    resetOperationsStore()
    vi.clearAllMocks()
  })

  it("undoes rename by calling tauriClient.renameEntry(newPath, oldName) and marks operation undone", async () => {
    ;(tauriClient.renameEntry as unknown as ReturnType<typeof vi.fn>).mockResolvedValue("/a/old")

    useOperationsHistoryStore.getState().addOperation({
      type: "rename",
      description: "rename",
      canUndo: true,
      data: { newPath: "/a/new", oldName: "old" },
    })

    const opBefore = useOperationsHistoryStore.getState().operations[0]
    expect(opBefore.undone).toBe(false)

    const result = await useOperationsHistoryStore.getState().undoLastOperation()
    expect(result).toBeTruthy()

    expect(tauriClient.renameEntry).toHaveBeenCalledTimes(1)
    expect(tauriClient.renameEntry).toHaveBeenCalledWith("/a/new", "old")

    const opAfter = useOperationsHistoryStore
      .getState()
      .operations.find((o) => o.id === opBefore.id)
    expect(opAfter?.undone).toBe(true)
    expect(useOperationsHistoryStore.getState().isUndoing).toBe(false)
  })

  it("undoes create by calling tauriClient.deleteEntries([newPath])", async () => {
    ;(tauriClient.deleteEntries as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    useOperationsHistoryStore.getState().addOperation({
      type: "create",
      description: "create",
      canUndo: true,
      data: { newPath: "/a/new.txt" },
    })

    await useOperationsHistoryStore.getState().undoLastOperation()

    expect(tauriClient.deleteEntries).toHaveBeenCalledTimes(1)
    expect(tauriClient.deleteEntries).toHaveBeenCalledWith(["/a/new.txt"])
    expect(useOperationsHistoryStore.getState().operations[0].undone).toBe(true)
  })

  it("undoes move by moving each item from destination back to its original parent", async () => {
    ;(tauriClient.moveEntries as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    useOperationsHistoryStore.getState().addOperation({
      type: "move",
      description: "move",
      canUndo: true,
      data: {
        sources: ["/a/x.txt", "/a/y.txt"],
        destination: "/b",
      },
    })

    await useOperationsHistoryStore.getState().undoLastOperation()

    expect(tauriClient.moveEntries).toHaveBeenCalledTimes(2)
    expect(tauriClient.moveEntries).toHaveBeenNthCalledWith(1, ["/b/x.txt"], "/a")
    expect(tauriClient.moveEntries).toHaveBeenNthCalledWith(2, ["/b/y.txt"], "/a")
  })

  it("resets isUndoing back to false even when undo fails", async () => {
    ;(tauriClient.renameEntry as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("boom"),
    )

    useOperationsHistoryStore.getState().addOperation({
      type: "rename",
      description: "rename",
      canUndo: true,
      data: { newPath: "/a/new", oldName: "old" },
    })

    await expect(useOperationsHistoryStore.getState().undoLastOperation()).rejects.toThrow("boom")
    expect(useOperationsHistoryStore.getState().isUndoing).toBe(false)

    // Operation should not be marked undone on failure
    expect(useOperationsHistoryStore.getState().operations[0].undone).toBe(false)
  })
})
