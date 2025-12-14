import { useCallback, useEffect, useMemo, useState } from "react"
import type { FileEntry } from "@/entities/file-entry"

interface UseKeyboardNavigationOptions {
  files: FileEntry[]
  selectedPaths: Set<string>
  onSelect: (path: string, e: { ctrlKey?: boolean; shiftKey?: boolean }) => void
  onOpen: (path: string, isDir: boolean) => void
  enabled?: boolean
}

export function useKeyboardNavigation({
  files,
  selectedPaths,
  onSelect,
  onOpen,
  enabled = true,
}: UseKeyboardNavigationOptions) {
  const [focusIndex, setFocusIndex] = useState(0)

  // Compute focus index from selection without using setState in effects
  const derivedFocusIndex = useMemo(() => {
    if (selectedPaths.size === 1) {
      const selectedPath = Array.from(selectedPaths)[0]
      const index = files.findIndex((f) => f.path === selectedPath)
      if (index !== -1) {
        return index
      }
    }
    return focusIndex
  }, [selectedPaths, files, focusIndex])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return

      // Ignore when focus is inside an input or textarea
      if (e.target instanceof HTMLInputElement) return
      if (e.target instanceof HTMLTextAreaElement) return

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault()
          setFocusIndex((prev) => {
            const newIndex = Math.min(prev + 1, files.length - 1)
            if (!e.shiftKey) {
              onSelect(files[newIndex].path, {
                ctrlKey: false,
                shiftKey: false,
              })
            } else {
              onSelect(files[newIndex].path, { shiftKey: true })
            }
            return newIndex
          })
          break

        case "ArrowUp":
          e.preventDefault()
          setFocusIndex((prev) => {
            const newIndex = Math.max(prev - 1, 0)
            if (!e.shiftKey) {
              onSelect(files[newIndex].path, {
                ctrlKey: false,
                shiftKey: false,
              })
            } else {
              onSelect(files[newIndex].path, { shiftKey: true })
            }
            return newIndex
          })
          break

        case "Enter":
          if (files[derivedFocusIndex]) {
            onOpen(files[derivedFocusIndex].path, files[derivedFocusIndex].is_dir)
          }
          break

        case " ":
          e.preventDefault()
          if (files[derivedFocusIndex]) {
            onSelect(files[derivedFocusIndex].path, { ctrlKey: true })
          }
          break

        case "Home":
          e.preventDefault()
          setFocusIndex(0)
          if (files.length > 0) {
            onSelect(files[0].path, { ctrlKey: false, shiftKey: false })
          }
          break

        case "End": {
          e.preventDefault()
          const lastIndex = files.length - 1
          setFocusIndex(lastIndex)
          if (files.length > 0) {
            onSelect(files[lastIndex].path, {
              ctrlKey: false,
              shiftKey: false,
            })
          }
          break
        }

        case "a":
          if (e.ctrlKey) {
            e.preventDefault()
            // Select all
            files.forEach((f) => {
              onSelect(f.path, { ctrlKey: true })
            })
          }
          break
      }
    },
    [files, derivedFocusIndex, onSelect, onOpen, enabled],
  )

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  return { focusIndex: derivedFocusIndex, setFocusIndex }
}
