import { create } from "zustand"

interface SelectionState {
  selectedPaths: Set<string>
  lastSelectedPath: string | null
  // Cached array version
  _cachedPaths: string[]
  _cacheValid: boolean

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
  _cachedPaths: [],
  _cacheValid: false,

  selectFile: (path, multiSelect = false) =>
    set((state) => {
      if (multiSelect) {
        const newSet = new Set(state.selectedPaths)
        if (newSet.has(path)) {
          newSet.delete(path)
        } else {
          newSet.add(path)
        }
        return {
          selectedPaths: newSet,
          lastSelectedPath: path,
          _cacheValid: false,
        }
      }
      return {
        selectedPaths: new Set([path]),
        lastSelectedPath: path,
        _cacheValid: false,
      }
    }),

  selectRange: (startPath, endPath, allPaths) =>
    set((state) => {
      const startIndex = allPaths.indexOf(startPath)
      const endIndex = allPaths.indexOf(endPath)

      if (startIndex === -1 || endIndex === -1) return state

      const start = Math.min(startIndex, endIndex)
      const end = Math.max(startIndex, endIndex)
      const rangePaths = allPaths.slice(start, end + 1)

      const newSet = new Set(state.selectedPaths)
      for (const p of rangePaths) {
        newSet.add(p)
      }

      return {
        selectedPaths: newSet,
        lastSelectedPath: endPath,
        _cacheValid: false,
      }
    }),

  toggleSelection: (path) =>
    set((state) => {
      const newSet = new Set(state.selectedPaths)
      if (newSet.has(path)) {
        newSet.delete(path)
      } else {
        newSet.add(path)
      }
      return {
        selectedPaths: newSet,
        lastSelectedPath: path,
        _cacheValid: false,
      }
    }),

  clearSelection: () =>
    set({
      selectedPaths: new Set(),
      lastSelectedPath: null,
      _cachedPaths: [],
      _cacheValid: true,
    }),

  selectAll: (paths) =>
    set({
      selectedPaths: new Set(paths),
      lastSelectedPath: paths[paths.length - 1] ?? null,
      _cacheValid: false,
    }),

  isSelected: (path) => get().selectedPaths.has(path),

  getSelectedPaths: () => {
    const state = get()
    // Return array copy of selected paths; avoid performing state updates during render
    return Array.from(state.selectedPaths)
  },
}))
