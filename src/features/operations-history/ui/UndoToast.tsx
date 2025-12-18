import { Undo2 } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { cn } from "@/shared/lib"
import { Button } from "@/shared/ui"
import { type Operation, useOperationsHistoryStore } from "../model/store"

interface UndoToastProps {
  operation: Operation
  onUndo: (operation: Operation) => void
  duration?: number
}

export function UndoToast({ operation, onUndo, duration = 5000 }: UndoToastProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [progress, setProgress] = useState(100)

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev - 100 / (duration / 100)
        if (next <= 0) {
          setIsVisible(false)
          return 0
        }
        return next
      })
    }, 100)

    const timeout = setTimeout(() => {
      setIsVisible(false)
    }, duration)

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [duration])

  if (!isVisible) return null

  return (
    <div
      className={cn(
        "fixed bottom-4 left-1/2 -translate-x-1/2 z-50",
        "bg-card border rounded-lg shadow-lg overflow-hidden",
        "animate-in slide-in-from-bottom-4 fade-in duration-200",
      )}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="text-sm">{operation.description}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onUndo(operation)
            setIsVisible(false)
          }}
          className="h-7 px-2"
        >
          <Undo2 className="h-4 w-4 mr-1" />
          Отменить
        </Button>
      </div>
      {/* Progress bar */}
      <div className="h-0.5 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

// Hook to show undo toast for last operation
export function useUndoToast(onOperation?: (op: Operation) => void) {
  const [currentOperation, setCurrentOperation] = useState<Operation | null>(null)
  const { undoLastOperation } = useOperationsHistoryStore()
  const operations = useOperationsHistoryStore((s) => s.operations)

  const showUndo = useCallback((operation: Operation) => {
    setCurrentOperation(operation)
  }, [])

  const handleUndo = useCallback(
    (operation: Operation) => {
      undoLastOperation()
      setCurrentOperation(null)
      // Return the operation so caller can perform the actual undo
      return operation
    },
    [undoLastOperation],
  )

  // Auto-show toasts for new operations and call optional callback
  useEffect(() => {
    if (!operations || operations.length === 0) return
    const op = operations[0]
    if (onOperation) onOperation(op)
    if (op.canUndo) showUndo(op)
  }, [operations, onOperation, showUndo])

  const toast = currentOperation ? (
    <UndoToast operation={currentOperation} onUndo={handleUndo} />
  ) : null

  return { showUndo, toast }
}
