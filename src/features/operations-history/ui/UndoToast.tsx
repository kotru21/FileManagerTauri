import { Undo2 } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { cn } from "@/shared/lib"
import { Button, toast } from "@/shared/ui"
import { type Operation, useOperationsHistoryStore } from "../model/store"

interface UndoToastProps {
  operation: Operation
  onUndo: (operation: Operation) => Promise<boolean> | boolean
  duration?: number
}

export function UndoToast({ operation, onUndo, duration = 5000 }: UndoToastProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [progress, setProgress] = useState(100)
  const [isUndoing, setIsUndoing] = useState(false)

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
          disabled={isUndoing}
          onClick={async () => {
            try {
              setIsUndoing(true)
              const ok = await onUndo(operation)
              if (ok) setIsVisible(false)
            } finally {
              setIsUndoing(false)
            }
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
export function useUndoToast(
  options?:
    | ((op: Operation) => void)
    | {
        onOperation?: (op: Operation) => void
        onUndoSuccess?: (op: Operation) => void
      },
) {
  const [currentOperation, setCurrentOperation] = useState<Operation | null>(null)
  const { undoLastOperation } = useOperationsHistoryStore()
  const operations = useOperationsHistoryStore((s) => s.operations)

  const onOperation = typeof options === "function" ? options : options?.onOperation
  const onUndoSuccess = typeof options === "function" ? undefined : options?.onUndoSuccess

  const callbacksRef = useRef<{
    onOperation?: (op: Operation) => void
    onUndoSuccess?: (op: Operation) => void
  }>({})
  callbacksRef.current.onOperation = onOperation
  callbacksRef.current.onUndoSuccess = onUndoSuccess

  const lastSeenOperationIdRef = useRef<string | null>(null)

  const showUndo = useCallback((operation: Operation) => {
    setCurrentOperation(operation)
  }, [])

  const handleUndo = useCallback(
    async (_operation: Operation) => {
      try {
        const op = await undoLastOperation()
        if (!op) return false

        callbacksRef.current.onUndoSuccess?.(op)
        setCurrentOperation(null)
        return true
      } catch (error) {
        toast.error(`Не удалось отменить: ${error}`)
        return false
      }
    },
    [undoLastOperation],
  )

  // Auto-show toasts for new operations and call optional callback
  useEffect(() => {
    if (!operations || operations.length === 0) return
    const op = operations[0]
    if (op.id && lastSeenOperationIdRef.current === op.id) return

    lastSeenOperationIdRef.current = op.id
    callbacksRef.current.onOperation?.(op)
    if (op.canUndo && !op.undone) showUndo(op)
  }, [operations, showUndo])

  const toastElement = currentOperation ? (
    <UndoToast operation={currentOperation} onUndo={handleUndo} />
  ) : null

  return { showUndo, toast: toastElement }
}
