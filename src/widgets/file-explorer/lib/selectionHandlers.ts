import type { BehaviorSettings } from "@/features/settings"
import type { FileEntry } from "@/shared/api/tauri"

export function isContextMenuEvent(e: React.MouseEvent | React.PointerEvent | MouseEvent) {
  // React synthetic events have type and possibly button; native contextmenu event has type 'contextmenu'
  // button === 2 is right mouse button
  return e.type === "contextmenu" || (e as MouseEvent).button === 2
}

export function handleSelectionEvent(options: {
  path: string
  e: React.MouseEvent | React.PointerEvent | MouseEvent
  files: FileEntry[]
  behaviorSettings: BehaviorSettings
  selectFile: (path: string) => void
  toggleSelection: (path: string) => void
  selectRange: (from: string, to: string, allPaths: string[]) => void
  getSelectedPaths: () => string[]
}): { shouldOpen: boolean } {
  const {
    path,
    e,
    files,
    behaviorSettings,
    selectFile,
    toggleSelection,
    selectRange,
    getSelectedPaths,
  } = options
  const isContext = isContextMenuEvent(e)

  // Find file
  const file = files.find((f) => f.path === path)
  if (!file) return { shouldOpen: false }

  // If doubleClickToOpen is disabled, single click should open; contextmenu should only select and not open
  if (!behaviorSettings.doubleClickToOpen) {
    // When singleClickToSelect is enabled, select before open
    if (behaviorSettings.singleClickToSelect) {
      selectFile(path)
    }

    // On contextmenu do selection only and DO NOT open/navigate
    if (isContext) {
      // ensure selection applied (already done if singleClickToSelect). If singleClickToSelect=false, still select on contextmenu
      if (!behaviorSettings.singleClickToSelect) {
        // when singleClickToSelect is false we still want to select on context
        selectFile(path)
      }
      return { shouldOpen: false }
    }

    // Not contextmenu: allow open/navigate
    return { shouldOpen: true }
  }

  // When doubleClickToOpen is enabled, single click should only select
  if (e instanceof MouseEvent || (e as React.MouseEvent)) {
    const me = e as React.MouseEvent
    if (me.shiftKey && files.length > 0) {
      const allPaths = files.map((f) => f.path)
      const lastSelected = getSelectedPaths()[0] || allPaths[0]
      selectRange(lastSelected, path, allPaths)
      return { shouldOpen: false }
    } else if (me.ctrlKey || me.metaKey) {
      toggleSelection(path)
      return { shouldOpen: false }
    } else {
      selectFile(path)
      return { shouldOpen: false }
    }
  }

  // default fallback
  selectFile(path)
  return { shouldOpen: false }
}
