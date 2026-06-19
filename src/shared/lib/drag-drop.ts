export interface DragData {
  paths: string[]
  action: "copy" | "move"
}

export const DRAG_DATA_TYPE = "application/x-file-manager-paths"

export function createDragData(paths: string[], action: "copy" | "move" = "move"): string {
  return JSON.stringify({ paths, action } satisfies DragData)
}

function parseDragPayload(raw: string): DragData | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<DragData>
    if (!Array.isArray(parsed.paths) || parsed.paths.length === 0) return null
    return {
      paths: parsed.paths.filter((p): p is string => typeof p === "string" && p.length > 0),
      action: parsed.action === "copy" ? "copy" : "move",
    }
  } catch {
    // WebView2 may only preserve text/plain for in-app drags.
    if (raw.includes(":\\") || raw.startsWith("/")) {
      return { paths: [raw], action: "move" }
    }
    return null
  }
}

/** Register all MIME types needed for reliable drops in WebView2/Chromium. */
export function setDragPayload(
  dataTransfer: DataTransfer,
  paths: string[],
  action: "copy" | "move" = "move",
): void {
  const payload = createDragData(paths, action)
  dataTransfer.setData(DRAG_DATA_TYPE, payload)
  dataTransfer.setData("application/json", payload)
  dataTransfer.setData("text/plain", payload)
  dataTransfer.effectAllowed = "copyMove"
}

export function parseDragData(dataTransfer: DataTransfer): DragData | null {
  try {
    for (const type of [DRAG_DATA_TYPE, "application/json", "text/plain"] as const) {
      const parsed = parseDragPayload(dataTransfer.getData(type))
      if (parsed) return parsed
    }
    return null
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
