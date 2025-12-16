import { useCallback, useEffect, useRef } from "react"
import { useSelectionStore } from "@/features/file-selection"
import { cn } from "@/shared/lib"
import { elementIntersectsRect, getNormalizedRect, useRubberBandStore } from "../model/store"

interface RubberBandOverlayProps {
  containerRef: React.RefObject<HTMLElement>
  fileSelector: string // CSS selector for file items
  getPathFromElement: (element: Element) => string | null
  className?: string
}

export function RubberBandOverlay({
  containerRef,
  fileSelector,
  getPathFromElement,
  className,
}: RubberBandOverlayProps) {
  const { isSelecting, rect, startSelection, updateSelection, endSelection } = useRubberBandStore()
  const { selectFile, clearSelection } = useSelectionStore()
  const isMouseDown = useRef(false)

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      // Only start on left click
      if (e.button !== 0) return

      // Don't start if clicking on a file item
      const target = e.target as HTMLElement
      if (target.closest(fileSelector)) return

      // Don't start if clicking on interactive elements
      if (target.closest("button, input, a, [role='button']")) return

      isMouseDown.current = true

      // Clear selection unless Ctrl is held
      if (!e.ctrlKey) {
        clearSelection()
      }

      startSelection(e.clientX, e.clientY)
    },
    [fileSelector, startSelection, clearSelection],
  )

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isMouseDown.current || !isSelecting) return
      updateSelection(e.clientX, e.clientY)
    },
    [isSelecting, updateSelection],
  )

  const handleMouseUp = useCallback(
    (e: MouseEvent) => {
      if (!isMouseDown.current) return
      isMouseDown.current = false

      const finalRect = endSelection()
      if (!finalRect || !containerRef.current) return

      const containerRect = containerRef.current.getBoundingClientRect()
      const normalized = getNormalizedRect(finalRect)

      // Minimum size threshold (5px)
      if (normalized.width < 5 || normalized.height < 5) return

      // Find all file elements that intersect with selection
      const fileElements = containerRef.current.querySelectorAll(fileSelector)
      const selectedPaths: string[] = []

      fileElements.forEach((element) => {
        const elemRect = element.getBoundingClientRect()
        if (elementIntersectsRect(elemRect, finalRect, containerRect)) {
          const path = getPathFromElement(element)
          if (path) {
            selectedPaths.push(path)
          }
        }
      })

      // Select files (add to selection if Ctrl held)
      selectedPaths.forEach((path) => {
        selectFile(path, e.ctrlKey)
      })
    },
    [endSelection, containerRef, fileSelector, getPathFromElement, selectFile],
  )

  // Attach event listeners to container
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener("mousedown", handleMouseDown)
    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)

    return () => {
      container.removeEventListener("mousedown", handleMouseDown)
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [containerRef, handleMouseDown, handleMouseMove, handleMouseUp])

  // Cancel on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isSelecting) {
        useRubberBandStore.getState().cancelSelection()
        isMouseDown.current = false
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isSelecting])

  if (!isSelecting || !rect) return null

  const normalized = getNormalizedRect(rect)

  return (
    <div
      className={cn(
        "fixed pointer-events-none border-2 border-primary/50 bg-primary/10 z-50",
        className,
      )}
      style={{
        left: normalized.left,
        top: normalized.top,
        width: normalized.width,
        height: normalized.height,
      }}
    />
  )
}
