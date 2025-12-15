import { useEffect } from "react"
import { useInlineEditStore } from "@/features/inline-edit"
import { useNavigationStore } from "@/features/navigation"

interface UseFileExplorerKeyboardOptions {
  onCopy: () => void
  onCut: () => void
  onPaste: () => void
  onDelete: () => void
  onStartNewFolder: () => void
  onRefresh: () => void
  getSelectedPaths: () => string[]
}

export function useFileExplorerKeyboard({
  onCopy,
  onCut,
  onPaste,
  onDelete,
  onStartNewFolder,
  onRefresh,
  getSelectedPaths,
}: UseFileExplorerKeyboardOptions) {
  const { goBack, goForward, goUp } = useNavigationStore()
  const { mode: inlineEditMode, startRename } = useInlineEditStore()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (inlineEditMode) return

      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return
      }

      const isCtrl = e.ctrlKey || e.metaKey

      if (isCtrl && e.key === "c") {
        e.preventDefault()
        onCopy()
      } else if (isCtrl && e.key === "x") {
        e.preventDefault()
        onCut()
      } else if (isCtrl && e.key === "v") {
        e.preventDefault()
        onPaste()
      } else if (e.key === "Delete") {
        e.preventDefault()
        onDelete()
      } else if (e.key === "F2") {
        e.preventDefault()
        const selected = getSelectedPaths()
        if (selected.length === 1) {
          startRename(selected[0])
        }
      } else if (isCtrl && e.shiftKey && e.key === "N") {
        e.preventDefault()
        onStartNewFolder()
      } else if (e.key === "F5") {
        e.preventDefault()
        onRefresh()
      } else if (e.key === "Backspace") {
        e.preventDefault()
        goUp()
      } else if (e.altKey && e.key === "ArrowLeft") {
        e.preventDefault()
        goBack()
      } else if (e.altKey && e.key === "ArrowRight") {
        e.preventDefault()
        goForward()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [
    inlineEditMode,
    onCopy,
    onCut,
    onPaste,
    onDelete,
    onStartNewFolder,
    onRefresh,
    goBack,
    goForward,
    goUp,
    getSelectedPaths,
    startRename,
  ])
}
