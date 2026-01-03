import { useEffect, useRef, useState } from "react"
import { useInlineEditStore } from "@/features/inline-edit"
import type { FileEntry } from "@/shared/api/tauri"
import { cn } from "@/shared/lib"
import { Button, Input } from "@/shared/ui"
import { FileGrid } from "./FileGrid"
import type { FileExplorerHandlers } from "./types"

interface Props {
  className?: string
  files: FileEntry[]
  selectedPaths: Set<string>
  handlers: FileExplorerHandlers
}

export function FileExplorerGrid({ className, files, selectedPaths, handlers }: Props) {
  const mode = useInlineEditStore((s) => s.mode)
  const inlineCancel = useInlineEditStore((s) => s.cancel)

  const [name, setName] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const isCreating = mode === "new-file" || mode === "new-folder"

  useEffect(() => {
    if (!isCreating) return
    setName("")
    requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
  }, [isCreating])

  const handleConfirm = () => {
    const trimmed = name.trim()
    if (!trimmed) return

    if (mode === "new-folder") handlers.handleCreateFolder?.(trimmed)
    else if (mode === "new-file") handlers.handleCreateFile?.(trimmed)

    inlineCancel()
  }

  return (
    <div className={cn("flex flex-col", className)}>
      {isCreating && (
        <div className="shrink-0 px-2 pt-2">
          <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-2">
            <Input
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={mode === "new-folder" ? "Имя папки..." : "Имя файла..."}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleConfirm()
                }
                if (e.key === "Escape") {
                  e.preventDefault()
                  inlineCancel()
                }
              }}
            />
            <Button type="button" size="sm" onClick={handleConfirm} disabled={!name.trim()}>
              Создать
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => inlineCancel()}>
              Отмена
            </Button>
          </div>
        </div>
      )}
      <FileGrid
        files={files}
        selectedPaths={selectedPaths}
        onSelect={handlers.handleSelect}
        onOpen={handlers.handleOpen}
        onDrop={handlers.handleDrop}
      />
    </div>
  )
}
