import { create } from "zustand"

export interface SelectionRect {
  startX: number
  startY: number
  endX: number
  endY: number
}

interface RubberBandState {
  isSelecting: boolean
  rect: SelectionRect | null
  startSelection: (x: number, y: number) => void
  updateSelection: (x: number, y: number) => void
  endSelection: () => SelectionRect | null
  cancelSelection: () => void
}

export const useRubberBandStore = create<RubberBandState>((set, get) => ({
  isSelecting: false,
  rect: null,

  startSelection: (x, y) =>
    set({
      isSelecting: true,
      rect: { startX: x, startY: y, endX: x, endY: y },
    }),

  updateSelection: (x, y) =>
    set((state) => ({
      rect: state.rect ? { ...state.rect, endX: x, endY: y } : null,
    })),

  endSelection: () => {
    const { rect } = get()
    set({ isSelecting: false, rect: null })
    return rect
  },

  cancelSelection: () => set({ isSelecting: false, rect: null }),
}))

// Helper to get normalized rect (always positive dimensions)
export function getNormalizedRect(rect: SelectionRect): {
  left: number
  top: number
  width: number
  height: number
} {
  const left = Math.min(rect.startX, rect.endX)
  const top = Math.min(rect.startY, rect.endY)
  const width = Math.abs(rect.endX - rect.startX)
  const height = Math.abs(rect.endY - rect.startY)
  return { left, top, width, height }
}

// Check if element intersects with selection rect
export function elementIntersectsRect(
  element: DOMRect,
  rect: SelectionRect,
  containerRect: DOMRect,
): boolean {
  const normalized = getNormalizedRect(rect)

  // Convert rect coordinates to be relative to container
  const selLeft = normalized.left - containerRect.left
  const selTop = normalized.top - containerRect.top
  const selRight = selLeft + normalized.width
  const selBottom = selTop + normalized.height

  // Element coordinates relative to container
  const elemLeft = element.left - containerRect.left
  const elemTop = element.top - containerRect.top
  const elemRight = elemLeft + element.width
  const elemBottom = elemTop + element.height

  // Check intersection
  return !(selRight < elemLeft || selLeft > elemRight || selBottom < elemTop || selTop > elemBottom)
}
