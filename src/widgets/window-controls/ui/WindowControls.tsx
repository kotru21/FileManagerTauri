import { getCurrentWindow } from "@tauri-apps/api/window"
import { Minus, Square, X } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { cn } from "@/shared/lib"

interface WindowControlsProps {
  className?: string
}

export function WindowControls({ className }: WindowControlsProps) {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    const window = getCurrentWindow()

    const checkMaximized = async () => {
      const maximized = await window.isMaximized()
      setIsMaximized(maximized)
    }
    checkMaximized()

    const unlisten = window.onResized(async () => {
      const maximized = await getCurrentWindow().isMaximized()
      setIsMaximized(maximized)
    })

    return () => {
      unlisten.then((fn) => fn())
    }
  }, [])

  const handleMinimize = useCallback(async () => {
    await getCurrentWindow().minimize()
  }, [])

  const handleMaximize = useCallback(async () => {
    await getCurrentWindow().toggleMaximize()
  }, [])

  const handleClose = useCallback(async () => {
    await getCurrentWindow().close()
  }, [])

  return (
    <div className={cn("flex items-center -mr-2", className)}>
      <button
        type="button"
        onClick={handleMinimize}
        className="flex h-8 w-12 items-center justify-center text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
        aria-label="Свернуть"
      >
        <Minus className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={handleMaximize}
        className="flex h-8 w-12 items-center justify-center text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
        aria-label={isMaximized ? "Восстановить" : "Развернуть"}
      >
        {isMaximized ? (
          <svg
            className="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="5" y="9" width="10" height="10" rx="1" />
            <path d="M9 9V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-4" />
          </svg>
        ) : (
          <Square className="h-3 w-3" />
        )}
      </button>
      <button
        type="button"
        onClick={handleClose}
        className="flex h-8 w-12 items-center justify-center text-muted-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
        aria-label="Закрыть"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
