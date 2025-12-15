import { create } from "zustand"

interface SelectionState {
  selectedPaths: Set<string>
  lastSelectedPath: string | null

  selectFile: (path: string, multiSelect?: boolean) => void
  selectRange: (startPath: string, endPath: string, allPaths: string[]) => void
  toggleSelection: (path: string) => void
  clearSelection: () => void
  selectAll: (paths: string[]) => void
  isSelected: (path: string) => boolean
  getSelectedPaths: () => string[]
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
  selectedPaths: new Set(),
  lastSelectedPath: null,

  selectFile: (path, multiSelect = false) => {
    set((state) => {
      if (multiSelect) {
        const newSet = new Set(state.selectedPaths)
        newSet.add(path)
        return { selectedPaths: newSet, lastSelectedPath: path }
      }
      return { selectedPaths: new Set([path]), lastSelectedPath: path }
    })
  },

  selectRange: (startPath, endPath, allPaths) => {
    const startIdx = allPaths.indexOf(startPath)
    const endIdx = allPaths.indexOf(endPath)
    if (startIdx === -1 || endIdx === -1) return

    const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx]
    const rangePaths = allPaths.slice(from, to + 1)

    set({
      selectedPaths: new Set(rangePaths),
      lastSelectedPath: endPath,
    })
  },

  toggleSelection: (path) => {
    set((state) => {
      const newSet = new Set(state.selectedPaths)
      if (newSet.has(path)) {
        newSet.delete(path)
      } else {
        newSet.add(path)
      }
      return { selectedPaths: newSet, lastSelectedPath: path }
    })
  },

  clearSelection: () => set({ selectedPaths: new Set(), lastSelectedPath: null }),

  selectAll: (paths) =>
    set({
      selectedPaths: new Set(paths),
      lastSelectedPath: paths[paths.length - 1] ?? null,
    }),

  isSelected: (path) => get().selectedPaths.has(path),

  getSelectedPaths: () => Array.from(get().selectedPaths),
}))
