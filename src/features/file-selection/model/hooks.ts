import { useSelectionStore } from "./store"

/**
 * Hook that returns selection state (read-only).
 * Use for components that only need to display selection info.
 */
export function useSelectionState() {
  const selectedPaths = useSelectionStore((s) => s.selectedPaths)
  const lastSelectedPath = useSelectionStore((s) => s.lastSelectedPath)

  return { selectedPaths, lastSelectedPath }
}

/**
 * Hook that returns selection actions (write-only).
 * Use for components that need to modify selection.
 */
export function useSelectionActions() {
  const selectFile = useSelectionStore((s) => s.selectFile)
  const selectRange = useSelectionStore((s) => s.selectRange)
  const toggleSelection = useSelectionStore((s) => s.toggleSelection)
  const clearSelection = useSelectionStore((s) => s.clearSelection)
  const selectAll = useSelectionStore((s) => s.selectAll)

  return {
    selectFile,
    selectRange,
    toggleSelection,
    clearSelection,
    selectAll,
  }
}

/**
 * Hook that returns selection utilities.
 */
export function useSelectionUtils() {
  const isSelected = useSelectionStore((s) => s.isSelected)
  const getSelectedPaths = useSelectionStore((s) => s.getSelectedPaths)

  return { isSelected, getSelectedPaths }
}

/**
 * Combined hook for components that need both state and actions.
 * Use sparingly - prefer atomic hooks for better performance.
 */
export function useSelection() {
  const { selectedPaths, lastSelectedPath } = useSelectionState()
  const actions = useSelectionActions()
  const utils = useSelectionUtils()

  return {
    selectedPaths,
    lastSelectedPath,
    ...actions,
    ...utils,
  }
}
