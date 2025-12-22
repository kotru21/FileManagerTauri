import { useEffect } from "react"
import { useCommandPaletteStore } from "@/features/command-palette"
import { useSelectionStore } from "@/features/file-selection"
import { useInlineEditStore } from "@/features/inline-edit"
import { useNavigationStore } from "@/features/navigation"
import { useQuickFilterStore } from "@/features/quick-filter"
import { useKeyboardSettings, useSettingsStore } from "@/features/settings"
import type { FileEntry } from "@/shared/api/tauri"
import { getLastFiles } from "@/shared/lib/devLogger"

export interface UseFileExplorerKeyboardOptions {
  files?: FileEntry[]
  onCopy: () => void
  onCut: () => void
  onPaste: () => void
  onDelete: () => void
  onStartNewFolder: () => void
  onStartRename?: () => void
  onRefresh: () => void
  onQuickLook?: () => void
}

export function useFileExplorerKeyboard({
  onCopy,
  onCut,
  onPaste,
  onDelete,
  onStartNewFolder,
  onStartRename,
  onRefresh,
  onQuickLook,
}: UseFileExplorerKeyboardOptions) {
  const { goBack, goForward, goUp } = useNavigationStore()
  const { mode: inlineEditMode } = useInlineEditStore()
  const { toggle: toggleQuickFilter } = useQuickFilterStore()
  const { open: openSettings } = useSettingsStore()

  // Selectors to avoid getState() in event handlers
  const getSelectedPaths = useSelectionStore((s) => s.getSelectedPaths)
  const selectFile = useSelectionStore((s) => s.selectFile)
  const toggleCommandPalette = useCommandPaletteStore((s) => s.toggle)

  const keyboardSettings = useKeyboardSettings()
  const shortcuts = keyboardSettings.shortcuts
  const enableVim = keyboardSettings.enableVimMode

  useEffect(() => {
    // Build a normalized signature map for enabled shortcuts
    const normalizeToken = (t: string) => {
      const token = t.trim().toLowerCase()
      if (token === "") return token
      // Map arrow names to canonical form used in settings (left/right/up/down)
      if (token.startsWith("arrow")) return token.replace(/^arrow/, "")
      if (token === " ") return "space"
      if (token === "space") return "space"
      return token
    }

    const normalizeSignature = (s: string) =>
      s
        .toLowerCase()
        .replace(/\s+/g, "")
        .split("+")
        .map((t) => normalizeToken(t))
        .join("+")

    const signatureFromEvent = (e: KeyboardEvent) => {
      const parts: string[] = []
      if (e.ctrlKey) parts.push("ctrl")
      if (e.shiftKey) parts.push("shift")
      if (e.altKey) parts.push("alt")
      if (e.metaKey) parts.push("meta")

      // Prefer code for Space and function keys, normalize names
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key
      const normalizedKey = normalizeToken(key)
      parts.push(normalizedKey)
      return parts.join("+")
    }

    const shortcutMap = new Map<string, string>()
    for (const s of shortcuts) {
      if (!s.enabled) continue
      shortcutMap.set(normalizeSignature(s.keys), s.id)
    }

    let lastGAt = 0

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if in input or inline edit mode
      const target = e.target as HTMLElement
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA"

      if (inlineEditMode) return

      // Vim navigation basic: j/k/select next/prev, gg -> top, G -> bottom
      if (enableVim && !isInput) {
        if (e.key === "j") {
          e.preventDefault()
          const sel = getSelectedPaths()
          const files = getLastFiles()
          if (!files || files.length === 0) return
          const last = sel[0] || files[0].path
          const idx = files.findIndex((f) => f.path === last)
          const next = files[Math.min(files.length - 1, (idx === -1 ? -1 : idx) + 1)]
          if (next) selectFile(next.path)
          return
        }
        if (e.key === "k") {
          e.preventDefault()
          const sel = getSelectedPaths()
          const files = getLastFiles()
          if (!files || files.length === 0) return
          const last = sel[0] || files[0].path
          const idx = files.findIndex((f) => f.path === last)
          const prev = files[Math.max(0, (idx === -1 ? 0 : idx) - 1)]
          if (prev) selectFile(prev.path)
          return
        }
        if (e.key === "g") {
          const now = Date.now()
          if (now - lastGAt < 350) {
            // gg -> go to first
            e.preventDefault()
            const files = getLastFiles()
            if (files && files.length > 0) selectFile(files[0].path)
            lastGAt = 0
            return
          }
          lastGAt = now
        }
        if (e.key === "G") {
          e.preventDefault()
          const files = getLastFiles()
          if (files && files.length > 0) selectFile(files[files.length - 1].path)
          return
        }
      }

      // If in input (including quick filter), only handle Escape
      if (isInput) {
        return
      }

      // Check settings shortcuts first
      const sig = signatureFromEvent(e)
      // Try direct match
      let action = shortcutMap.get(sig)
      // If not found, try ctrl/meta alias (so Cmd on mac works for Ctrl shortcuts)
      if (!action) {
        if (sig.includes("meta")) {
          action = shortcutMap.get(sig.replace(/\bmeta\b/, "ctrl"))
        }
        if (!action && sig.includes("ctrl")) {
          action = shortcutMap.get(sig.replace(/\bctrl\b/, "meta"))
        }
      }

      if (action) {
        e.preventDefault()
        switch (action) {
          case "copy":
            onCopy()
            break
          case "cut":
            onCut()
            break
          case "paste":
            onPaste()
            break
          case "delete":
            onDelete()
            break
          case "newFolder":
            onStartNewFolder()
            break
          case "rename":
            // Start inline rename flow
            ;(onStartRename ?? (() => {}))()
            break
          case "refresh":
            onRefresh()
            break
          case "quickFilter":
          case "search":
            toggleQuickFilter()
            break
          case "settings":
            openSettings()
            break
          case "commandPalette":
            toggleCommandPalette()
            break
          default:
            break
        }
        return
      }

      // Fallbacks for older hardcoded behavior
      // Quick Look (Space)
      if (e.code === "Space" && onQuickLook) {
        e.preventDefault()
        onQuickLook()
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

      // Start typing to activate quick filter (disabled in vim mode)
      if (
        !enableVim &&
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
    shortcuts,
    enableVim,
    getSelectedPaths,
    selectFile,
    toggleCommandPalette,
    onStartRename,
  ])
}
