export interface DragData {
  paths: string[]
  action: "copy" | "move"
}

export const DRAG_DATA_TYPE = "application/x-file-manager-paths"

export function createDragData(paths: string[], action: "copy" | "move" = "move"): string {
  return JSON.stringify({ paths, action } as DragData)
}

export function parseDragData(dataTransfer: DataTransfer): DragData | null {
  try {
    const data = dataTransfer.getData(DRAG_DATA_TYPE)
    if (!data) {
      // Try fallback JSON format
      const jsonData = dataTransfer.getData("application/json")
      if (jsonData) {
        const parsed = JSON.parse(jsonData)
        return {
          paths: parsed.paths || [],
          action: parsed.action || "move",
        }
      }
      return null
    }
    return JSON.parse(data) as DragData
  } catch {
    return null
  }
}

export function setDragImage(e: React.DragEvent, count: number): void {
  const dragImage = document.createElement("div")
  dragImage.className =
    "fixed -top-[1000px] flex items-center gap-2 rounded bg-accent px-3 py-2 text-sm shadow-lg"
  dragImage.innerHTML = `
    <span class="font-medium">${count}</span>
    <span>${count === 1 ? "элемент" : "элементов"}</span>
  `
  document.body.appendChild(dragImage)
  e.dataTransfer.setDragImage(dragImage, 0, 0)

  // Cleanup after drag starts
  requestAnimationFrame(() => {
    document.body.removeChild(dragImage)
  })
}

export function getDragAction(e: React.DragEvent | DragEvent): "copy" | "move" {
  return e.ctrlKey ? "copy" : "move"
}

export function setDropEffect(e: React.DragEvent, canDrop: boolean): void {
  if (canDrop) {
    e.dataTransfer.dropEffect = e.ctrlKey ? "copy" : "move"
  } else {
    e.dataTransfer.dropEffect = "none"
  }
}
