/// <reference types="vitest" />
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/shared/api/tauri/client", () => {
  return {
    tauriClient: {
      deleteEntries: vi.fn(),
    },
  }
})

import { tauriClient } from "@/shared/api/tauri/client"
import { useOperationsHistoryStore } from "../../model/store"
import { useUndoToast } from "../UndoToast"

function resetOperationsStore() {
  useOperationsHistoryStore.setState({ operations: [], isUndoing: false })
}

function TestHost() {
  const { toast } = useUndoToast()
  return <>{toast}</>
}

describe("useUndoToast integration", () => {
  beforeEach(() => {
    resetOperationsStore()
    vi.clearAllMocks()
  })

  it("auto-shows toast for latest undoable operation", async () => {
    render(<TestHost />)

    act(() => {
      useOperationsHistoryStore.getState().addOperation({
        type: "create",
        description: "Создание файла",
        canUndo: true,
        data: { newPath: "/a/new.txt" },
      })
    })

    expect(await screen.findByText("Создание файла")).toBeTruthy()
    expect(await screen.findByRole("button", { name: "Отменить" })).toBeTruthy()
  })

  it("does not auto-show toast for non-undoable operation", async () => {
    render(<TestHost />)

    act(() => {
      useOperationsHistoryStore.getState().addOperation({
        type: "delete",
        description: "Удаление",
        canUndo: false,
        data: { deletedPaths: ["/a/x"] },
      })
    })

    // No toast should appear
    expect(screen.queryByText("Удаление")).toBeNull()
  })

  it("clicking Undo calls undoLastOperation and hides toast on success", async () => {
    ;(tauriClient.deleteEntries as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    render(<TestHost />)

    act(() => {
      useOperationsHistoryStore.getState().addOperation({
        type: "create",
        description: "Создание файла",
        canUndo: true,
        data: { newPath: "/a/new.txt" },
      })
    })

    await screen.findByText("Создание файла")
    const undo = await screen.findByRole("button", { name: "Отменить" })
    fireEvent.click(undo)

    // create undo -> deleteEntries
    expect(tauriClient.deleteEntries).toHaveBeenCalledWith(["/a/new.txt"])

    // toast should disappear
    await waitFor(() => {
      expect(screen.queryByText("Создание файла")).toBeNull()
    })
  })
})
