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
  const { isSelecting, rect, startSelection, updateSelection, endSelection, cancelSelection } =
    useRubberBandStore()
  const { selectFile, clearSelection } = useSelectionStore()

  const isSelectingRef = useRef(false)
  const rafRef = useRef<number | null>(null)
  const lastUpdateRef = useRef<{ x: number; y: number } | null>(null)

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      if (e.button !== 0) return
      if (!containerRef.current) return

      const target = e.target as Element
      if (target.closest(fileSelector)) return
      if (target.closest("button, input, [role='menuitem']")) return

      if (!e.ctrlKey && !e.metaKey) {
        clearSelection()
      }

      const containerRect = containerRef.current.getBoundingClientRect()
      const x = e.clientX - containerRect.left + containerRef.current.scrollLeft
      const y = e.clientY - containerRect.top + containerRef.current.scrollTop

      startSelection(x, y)
      isSelectingRef.current = true
    },
    [containerRef, fileSelector, clearSelection, startSelection],
  )

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isSelectingRef.current || !containerRef.current) return

      // Store latest position
      const containerRect = containerRef.current.getBoundingClientRect()
      const x = e.clientX - containerRect.left + containerRef.current.scrollLeft
      const y = e.clientY - containerRect.top + containerRef.current.scrollTop
      lastUpdateRef.current = { x, y }

      // RAF throttle - only update once per frame
      if (rafRef.current !== null) return

      rafRef.current = requestAnimationFrame(() => {
        if (lastUpdateRef.current) {
          updateSelection(lastUpdateRef.current.x, lastUpdateRef.current.y)
        }
        rafRef.current = null
      })
    },
    [containerRef, updateSelection],
  )

  const handleMouseUp = useCallback(
    (e: MouseEvent) => {
      if (!isSelectingRef.current) return
      isSelectingRef.current = false

      // Cancel any pending RAF
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }

      const finalRect = endSelection()
      if (!finalRect || !containerRef.current) return

      const normalized = getNormalizedRect(finalRect)
      if (normalized.width < 5 && normalized.height < 5) return

      const containerRect = containerRef.current.getBoundingClientRect()
      const fileElements = containerRef.current.querySelectorAll(fileSelector)

      const selectedPaths: string[] = []
      fileElements.forEach((element) => {
        const elementRect = element.getBoundingClientRect()
        if (elementIntersectsRect(elementRect, finalRect, containerRect)) {
          const path = getPathFromElement(element)
          if (path) selectedPaths.push(path)
        }
      })

      const isAdditive = e.ctrlKey || e.metaKey
      selectedPaths.forEach((path) => {
        selectFile(path, isAdditive)
      })
    },
    [containerRef, fileSelector, getPathFromElement, endSelection, selectFile],
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener("mousedown", handleMouseDown)
    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isSelectingRef.current) {
        isSelectingRef.current = false
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current)
          rafRef.current = null
        }
        cancelSelection()
      }
    }
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      container.removeEventListener("mousedown", handleMouseDown)
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
      document.removeEventListener("keydown", handleKeyDown)
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [containerRef, handleMouseDown, handleMouseMove, handleMouseUp, cancelSelection])

  if (!isSelecting || !rect) return null

  const normalized = getNormalizedRect(rect)

  return (
    <div
      className={cn(
        "absolute border border-primary/50 bg-primary/10 pointer-events-none z-50",
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
