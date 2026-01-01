import { useCallback, useEffect, useRef, useState } from "react"
import type { FileEntry } from "@/shared/api/tauri"

interface UseKeyboardNavigationOptions {
  files: FileEntry[]
  selectedPaths: Set<string>
  onSelect: (path: string, e: { ctrlKey?: boolean; shiftKey?: boolean }) => void
  onOpen: (path: string, isDir: boolean) => void
  enabled?: boolean
}

interface UseKeyboardNavigationResult {
  focusedIndex: number
  setFocusedIndex: (index: number) => void
}

export function useKeyboardNavigation({
  files,
  selectedPaths,
  onSelect,
  onOpen,
  enabled = true,
}: UseKeyboardNavigationOptions): UseKeyboardNavigationResult {
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const filesRef = useRef(files)
  useEffect(() => {
    filesRef.current = files
  }, [files])
  useEffect(() => {
    if (!selectedPaths || selectedPaths.size === 0) {
      return
    }
    const lastSelected = Array.from(selectedPaths).pop()
    if (lastSelected) {
      const index = files.findIndex((f) => f.path === lastSelected)
      if (index !== -1 && index !== focusedIndex) {
        setFocusedIndex(index)
      }
    }
  }, [selectedPaths, files, focusedIndex])
  useEffect(() => {
    if (files.length === 0) {
      setFocusedIndex(-1)
    } else if (focusedIndex >= files.length) {
      setFocusedIndex(Math.max(0, files.length - 1))
    }
  }, [files.length, focusedIndex])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return
      const target = e.target as HTMLElement
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return
      }

      const currentFiles = filesRef.current
      if (currentFiles.length === 0) return

      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault()
          const nextIndex = Math.min(focusedIndex + 1, currentFiles.length - 1)
          setFocusedIndex(nextIndex)
          onSelect(currentFiles[nextIndex].path, { ctrlKey: e.ctrlKey, shiftKey: e.shiftKey })
          break
        }
        case "ArrowUp": {
          e.preventDefault()
          const prevIndex = Math.max(focusedIndex - 1, 0)
          setFocusedIndex(prevIndex)
          onSelect(currentFiles[prevIndex].path, { ctrlKey: e.ctrlKey, shiftKey: e.shiftKey })
          break
        }
        case "Home": {
          e.preventDefault()
          setFocusedIndex(0)
          onSelect(currentFiles[0].path, { ctrlKey: e.ctrlKey, shiftKey: e.shiftKey })
          break
        }
        case "End": {
          e.preventDefault()
          const lastIndex = currentFiles.length - 1
          setFocusedIndex(lastIndex)
          onSelect(currentFiles[lastIndex].path, { ctrlKey: e.ctrlKey, shiftKey: e.shiftKey })
          break
        }
        case "Enter": {
          e.preventDefault()
          if (focusedIndex >= 0 && focusedIndex < currentFiles.length) {
            const file = currentFiles[focusedIndex]
            onOpen(file.path, file.is_dir)
          }
          break
        }
        case "PageDown": {
          e.preventDefault()
          const pageSize = 10
          const nextIndex = Math.min(focusedIndex + pageSize, currentFiles.length - 1)
          setFocusedIndex(nextIndex)
          onSelect(currentFiles[nextIndex].path, { ctrlKey: e.ctrlKey, shiftKey: e.shiftKey })
          break
        }
        case "PageUp": {
          e.preventDefault()
          const pageSize = 10
          const prevIndex = Math.max(focusedIndex - pageSize, 0)
          setFocusedIndex(prevIndex)
          onSelect(currentFiles[prevIndex].path, { ctrlKey: e.ctrlKey, shiftKey: e.shiftKey })
          break
        }
      }
    },
    [enabled, focusedIndex, onSelect, onOpen],
  )

  useEffect(() => {
    if (!enabled) return

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [enabled, handleKeyDown])

  return {
    focusedIndex,
    setFocusedIndex,
  }
}
