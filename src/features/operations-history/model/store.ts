import { create } from "zustand"

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
  addOperation: (operation: Omit<Operation, "id" | "timestamp" | "undone">) => void
  undoLastOperation: () => Operation | null
  clearHistory: () => void
  getLastUndoableOperation: () => Operation | null
}

const generateId = () => Math.random().toString(36).slice(2, 11)

export const useOperationsHistoryStore = create<OperationsHistoryState>((set, get) => ({
  operations: [],
  maxHistory: 50,

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

  undoLastOperation: () => {
    const operation = get().getLastUndoableOperation()
    if (!operation) return null

    set((state) => ({
      operations: state.operations.map((op) =>
        op.id === operation.id ? { ...op, undone: true } : op,
      ),
    }))

    return operation
  },

  clearHistory: () => set({ operations: [] }),

  getLastUndoableOperation: () => {
    const { operations } = get()
    return operations.find((op) => op.canUndo && !op.undone) || null
  },
}))

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
