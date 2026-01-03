import { create } from "zustand"
import { tauriClient } from "@/shared/api/tauri/client"
import { getBasename, joinPath } from "@/shared/lib"

export type OperationType = "copy" | "move" | "delete" | "rename" | "create"

export interface Operation {
  id: string
  type: OperationType
  timestamp: number
  description: string
  // Data needed to undo
  data: {
    sources?: string[]
    destination?: string
    oldPath?: string
    oldName?: string
    newName?: string
    newPath?: string
    deletedPaths?: string[]
  }
  // Whether this operation can be undone
  canUndo: boolean
  // Whether this operation was already undone
  undone: boolean
}

interface OperationsHistoryState {
  operations: Operation[]
  maxHistory: number
  isUndoing: boolean
  addOperation: (operation: Omit<Operation, "id" | "timestamp" | "undone">) => void
  undoLastOperation: () => Promise<Operation | null>
  clearHistory: () => void
  getLastUndoableOperation: () => Operation | null
}

const generateId = () => Math.random().toString(36).slice(2, 11)

export const useOperationsHistoryStore = create<OperationsHistoryState>((set, get) => ({
  operations: [],
  maxHistory: 50,
  isUndoing: false,

  addOperation: (operation) =>
    set((state) => {
      const newOperation: Operation = {
        ...operation,
        id: generateId(),
        timestamp: Date.now(),
        undone: false,
      }

      const operations = [newOperation, ...state.operations].slice(0, state.maxHistory)
      return { operations }
    }),

  undoLastOperation: async () => {
    const operation = get().getLastUndoableOperation()
    if (!operation) return null

    set({ isUndoing: true })

    try {
      await undoOperation(operation)

      set((state) => ({
        operations: state.operations.map((op) =>
          op.id === operation.id ? { ...op, undone: true } : op,
        ),
      }))

      return operation
    } finally {
      set({ isUndoing: false })
    }
  },

  clearHistory: () => set({ operations: [] }),

  getLastUndoableOperation: () => {
    const { operations } = get()
    return operations.find((op) => op.canUndo && !op.undone) || null
  },
}))

function getDirname(path: string): string {
  const normalized = (path ?? "").replace(/\\/g, "/").replace(/\/+$/, "")
  if (!normalized) return ""

  const idx = normalized.lastIndexOf("/")
  if (idx === -1) return ""
  if (idx === 0) return "/"
  return normalized.slice(0, idx)
}

async function undoOperation(operation: Operation): Promise<void> {
  const { type, data } = operation

  switch (type) {
    case "rename": {
      const { newPath, oldName } = data
      if (!newPath || !oldName) {
        throw new Error("Недостаточно данных для отмены переименования")
      }
      await tauriClient.renameEntry(newPath, oldName)
      return
    }
    case "move": {
      const { sources, destination } = data
      if (!sources?.length || !destination) {
        throw new Error("Недостаточно данных для отмены перемещения")
      }

      for (const source of sources) {
        const originalParent = getDirname(source)
        const movedPath = joinPath(destination, getBasename(source))
        await tauriClient.moveEntries([movedPath], originalParent)
      }

      return
    }
    case "create": {
      const { newPath } = data
      if (!newPath) {
        throw new Error("Недостаточно данных для отмены создания")
      }
      await tauriClient.deleteEntries([newPath])
      return
    }
    case "copy":
    case "delete": {
      throw new Error("Эта операция пока не поддерживает отмену")
    }
    default: {
      throw new Error("Неизвестный тип операции")
    }
  }
}

// Helper to create operation descriptions
export function createOperationDescription(type: OperationType, data: Operation["data"]): string {
  switch (type) {
    case "copy":
      return `Копирование ${data.sources?.length || 0} файл(ов) в ${data.destination}`
    case "move":
      return `Перемещение ${data.sources?.length || 0} файл(ов) в ${data.destination}`
    case "delete":
      return `Удаление ${data.deletedPaths?.length || 0} файл(ов)`
    case "rename":
      return `Переименование "${data.oldName}" в "${data.newName}"`
    case "create":
      return `Создание "${data.newPath}"`
    default:
      return "Неизвестная операция"
  }
}
