import { useEffect } from "react"
import { useInlineEditStore } from "@/features/inline-edit"
import { useNavigationStore } from "@/features/navigation"
import { useQuickFilterStore } from "@/features/quick-filter"
import { useSettingsStore } from "@/features/settings"

interface UseFileExplorerKeyboardOptions {
  onCopy: () => void
  onCut: () => void
  onPaste: () => void
  onDelete: () => void
  onStartNewFolder: () => void
  onRefresh: () => void
  onQuickLook?: () => void
}

export function useFileExplorerKeyboard({
  onCopy,
  onCut,
  onPaste,
  onDelete,
  onStartNewFolder,
  onRefresh,
  onQuickLook,
}: UseFileExplorerKeyboardOptions) {
  const { goBack, goForward, goUp } = useNavigationStore()
  const { mode: inlineEditMode } = useInlineEditStore()
  const { toggle: toggleQuickFilter } = useQuickFilterStore()
  const { open: openSettings } = useSettingsStore()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if in input or inline edit mode
      const target = e.target as HTMLElement
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA"

      if (inlineEditMode) return

      // Settings (Ctrl+,)
      if ((e.ctrlKey || e.metaKey) && e.key === ",") {
        e.preventDefault()
        openSettings()
        return
      }

      // Quick filter toggle (Ctrl+Shift+F)
      if (e.ctrlKey && e.shiftKey && e.key === "F") {
        e.preventDefault()
        toggleQuickFilter()
        return
      }

      // If in input (including quick filter), only handle Escape
      if (isInput) {
        return
      }

      // Quick Look (Space)
      if (e.code === "Space" && onQuickLook) {
        e.preventDefault()
        onQuickLook()
        return
      }

      // Copy (Ctrl+C)
      if (e.ctrlKey && e.key === "c") {
        e.preventDefault()
        onCopy()
        return
      }

      // Cut (Ctrl+X)
      if (e.ctrlKey && e.key === "x") {
        e.preventDefault()
        onCut()
        return
      }

      // Paste (Ctrl+V)
      if (e.ctrlKey && e.key === "v") {
        e.preventDefault()
        onPaste()
        return
      }

      // Delete
      if (e.key === "Delete") {
        e.preventDefault()
        onDelete()
        return
      }

      // New folder (Ctrl+Shift+N)
      if (e.ctrlKey && e.shiftKey && e.key === "N") {
        e.preventDefault()
        onStartNewFolder()
        return
      }

      // Refresh (F5)
      if (e.key === "F5") {
        e.preventDefault()
        onRefresh()
        return
      }

      // Navigate back (Alt+Left or Backspace)
      if ((e.altKey && e.key === "ArrowLeft") || e.key === "Backspace") {
        e.preventDefault()
        goBack()
        return
      }

      // Navigate forward (Alt+Right)
      if (e.altKey && e.key === "ArrowRight") {
        e.preventDefault()
        goForward()
        return
      }

      // Navigate up (Alt+Up)
      if (e.altKey && e.key === "ArrowUp") {
        e.preventDefault()
        goUp()
        return
      }

      // Start typing to activate quick filter
      if (
        !e.ctrlKey &&
        !e.altKey &&
        !e.metaKey &&
        e.key.length === 1 &&
        e.key.match(/[a-zA-Z0-9а-яА-Я]/)
      ) {
        toggleQuickFilter()
        return
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [
    onCopy,
    onCut,
    onPaste,
    onDelete,
    onStartNewFolder,
    onRefresh,
    onQuickLook,
    goBack,
    goForward,
    goUp,
    inlineEditMode,
    toggleQuickFilter,
    openSettings,
  ])
}
