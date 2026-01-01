import { openPath } from "@tauri-apps/plugin-opener"
import { useEffect, useState } from "react"
import type { FileEntry, FilePreview } from "@/shared/api/tauri"
import { tauriClient } from "@/shared/api/tauri/client"

/**
 * Extended FileEntry with optional preview data for inline display.
 */
export interface FileEntryWithPreview extends FileEntry {
  _preview?: FilePreview
}

export type UseFolderPreviewReturn = {
  entries: FileEntryWithPreview[] | null
  isLoadingEntries: boolean
  error: string | null
  pathStack: string[]
  currentPath: string
  handleToggleUp: () => void
  handleEnterFolder: (entry: FileEntry) => void
  handleShowFile: (entry: FileEntry) => Promise<void>
  handleOpenExternal: (path: string) => Promise<void>
}

export function useFolderPreview(
  root: FileEntry | null,
  opts?: {
    onOpenFile?: (entry: FileEntry, preview: FilePreview) => void
    onOpenFolder?: (entry: FileEntry) => void
  },
) {
  const [entries, setEntries] = useState<FileEntryWithPreview[] | null>(null)
  const [isLoadingEntries, setIsLoadingEntries] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [pathStack, setPathStack] = useState<string[]>(root ? [root.path] : [])

  const currentPath = pathStack[pathStack.length - 1]

  useEffect(() => {
    if (!root) return
    setPathStack([root.path])
    setEntries(null)
    setError(null)
  }, [root])

  useEffect(() => {
    if (!currentPath) return
    let cancelled = false
    const load = async () => {
      setIsLoadingEntries(true)
      setError(null)
      try {
        const dir = await tauriClient.readDirectory(currentPath)
        if (!cancelled) setEntries(dir)
      } catch (err) {
        if (!cancelled) setError(String(err))
      } finally {
        if (!cancelled) setIsLoadingEntries(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [currentPath])

  const handleToggleUp = async () => {
    if (pathStack.length > 1) setPathStack((s) => s.slice(0, s.length - 1))
  }

  const handleEnterFolder = (entry: FileEntry) => {
    if (!entry.is_dir) return
    if (opts?.onOpenFolder) return opts.onOpenFolder(entry)
    setPathStack((s) => [...s, entry.path])
  }

  const handleShowFile = async (entry: FileEntry) => {
    if (entry.is_dir) return
    try {
      setIsLoadingEntries(true)
      const preview = await tauriClient.getFilePreview(entry.path)
      if (opts?.onOpenFile) return opts.onOpenFile(entry, preview)
      // attach preview inline
      setEntries([{ ...entry, _preview: preview }])
    } catch (err) {
      setError(String(err))
    } finally {
      setIsLoadingEntries(false)
    }
  }

  const handleOpenExternal = async (path: string) => {
    await openPath(path)
  }

  return {
    entries,
    isLoadingEntries,
    error,
    pathStack,
    currentPath,
    handleToggleUp,
    handleEnterFolder,
    handleShowFile,
    handleOpenExternal,
  } as UseFolderPreviewReturn
}
