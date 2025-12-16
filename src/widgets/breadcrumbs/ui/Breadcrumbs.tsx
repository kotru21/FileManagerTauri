import { ChevronRight, Home } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigationStore } from "@/features/navigation"
import { commands } from "@/shared/api/tauri"
import { cn } from "@/shared/lib"
import { Input } from "@/shared/ui"

interface BreadcrumbsProps {
  className?: string
}

export function Breadcrumbs({ className }: BreadcrumbsProps) {
  const { currentPath, navigate } = useNavigationStore()
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState("")
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Parse path into segments
  const segments = useMemo(() => {
    if (!currentPath) return []

    // Windows drive letter handling
    const normalized = currentPath.replace(/\\/g, "/")
    const parts = normalized.split("/").filter(Boolean)

    // Reconstruct paths for each segment
    const result: { name: string; path: string }[] = []
    let accumulated = ""

    for (const part of parts) {
      // Handle Windows drive (e.g., "C:")
      if (part.match(/^[A-Za-z]:$/)) {
        accumulated = `${part}/`
        result.push({ name: part, path: accumulated })
      } else {
        accumulated = accumulated ? `${accumulated}${part}/` : `/${part}/`
        result.push({ name: part, path: accumulated.slice(0, -1) })
      }
    }

    return result
  }, [currentPath])

  // Enter edit mode
  const startEditing = useCallback(() => {
    setEditValue(currentPath || "")
    setError(null)
    setIsEditing(true)
  }, [currentPath])

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  // Handle keyboard shortcut (Ctrl+L)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "l") {
        e.preventDefault()
        startEditing()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [startEditing])

  // Validate and navigate to path
  const handleSubmit = useCallback(async () => {
    if (!editValue.trim()) {
      setIsEditing(false)
      return
    }

    const normalizedPath = editValue.trim().replace(/\//g, "\\")

    try {
      const result = await commands.pathExists(normalizedPath)
      if (result.status === "ok" && result.data) {
        navigate(normalizedPath)
        setIsEditing(false)
        setError(null)
      } else {
        setError("Путь не существует")
      }
    } catch {
      setError("Ошибка проверки пути")
    }
  }, [editValue, navigate])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault()
        handleSubmit()
      } else if (e.key === "Escape") {
        setIsEditing(false)
        setError(null)
      }
    },
    [handleSubmit],
  )

  const handleBlur = useCallback(() => {
    // Delay to allow click on suggestions if we add them later
    setTimeout(() => {
      setIsEditing(false)
      setError(null)
    }, 150)
  }, [])

  // Edit mode
  if (isEditing) {
    return (
      <div className={cn("flex flex-col", className)}>
        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => {
              setEditValue(e.target.value)
              setError(null)
            }}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className={cn(
              "h-8 text-sm font-mono flex-1",
              error && "border-red-500 focus-visible:ring-red-500",
            )}
            placeholder="Введите путь..."
          />
        </div>
        {error && <span className="text-xs text-red-500 mt-1">{error}</span>}
      </div>
    )
  }

  // Normal breadcrumbs view
  return (
    <div
      className={cn("flex items-center gap-1 text-sm overflow-hidden", className)}
      onClick={startEditing}
      onKeyDown={(e) => e.key === "Enter" && startEditing()}
      role="button"
      tabIndex={0}
      title="Нажмите для редактирования пути (Ctrl+L)"
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          // Navigate to root/drives
          navigate(segments[0]?.path || "C:/")
        }}
        className="p-1 hover:bg-accent rounded transition-colors shrink-0"
        title="Домой"
      >
        <Home className="h-4 w-4" />
      </button>

      {segments.map((segment, index) => (
        <div key={segment.path} className="flex items-center gap-1 min-w-0">
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              navigate(segment.path)
            }}
            className={cn(
              "px-1.5 py-0.5 rounded hover:bg-accent transition-colors truncate max-w-37.5",
              index === segments.length - 1 && "font-medium text-foreground",
              index !== segments.length - 1 && "text-muted-foreground",
            )}
            title={segment.path}
          >
            {segment.name}
          </button>
        </div>
      ))}

      {!currentPath && <span className="text-muted-foreground italic">Выберите папку</span>}
    </div>
  )
}
