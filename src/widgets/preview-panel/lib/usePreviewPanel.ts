import { useEffect, useState } from "react"
import type { FileEntry, FilePreview } from "@/shared/api/tauri"
import { tauriClient } from "@/shared/api/tauri/client"

export function usePreviewPanel(file: FileEntry | null) {
  const [preview, setPreview] = useState<FilePreview | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileEntry, setFileEntry] = useState<FileEntry | null>(null)

  const openFilePreview = (entry: FileEntry, p: FilePreview) => {
    setPreview(p)
    setFileEntry(entry)
  }

  const openFolderPreview = (entry: FileEntry) => {
    setPreview(null)
    setFileEntry(entry)
  }

  useEffect(() => {
    let cancelled = false

    const resolveMetadata = async () => {
      setFileEntry(null)

      if (!file) return

      if (file.name != null || file.size != null || file.modified != null || file.created != null) {
        setFileEntry(file)
        return
      }

      try {
        const parentPath = await tauriClient.getParentPath(file.path)
        if (parentPath) {
          const dir = await tauriClient.readDirectory(parentPath)
          const found = dir.find((f: FileEntry) => f.path === file.path)
          if (!cancelled) {
            if (found) setFileEntry(found)
            else
              setFileEntry({
                ...file,
                name: file.path.split("\\").pop() || file.path,
                size: 0,
                is_dir: false,
                is_hidden: false,
                extension: null,
                modified: null,
                created: null,
              })
          }
          return
        }
      } catch {
        void 0
      }

      if (!cancelled)
        setFileEntry({
          ...file,
          name: file.path.split("\\").pop() || file.path,
          size: 0,
          is_dir: false,
          is_hidden: false,
          extension: null,
          modified: null,
          created: null,
        })
    }

    resolveMetadata()

    return () => {
      cancelled = true
    }
  }, [file])

  useEffect(() => {
    let cancelled = false

    if (!fileEntry || fileEntry.is_dir) {
      setPreview(null)
      setError(null)
      return
    }

    const loadPreview = async () => {
      setPreview(null)
      setIsLoading(true)
      setError(null)

      try {
        const preview = await tauriClient.getFilePreview(fileEntry.path)
        if (!cancelled) {
          setPreview(preview)
        }
      } catch (err) {
        if (!cancelled) setError(String(err))
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadPreview()

    return () => {
      cancelled = true
    }
  }, [fileEntry])

  return {
    preview,
    isLoading,
    error,
    fileEntry,
    setFileEntry,
    openFilePreview,
    openFolderPreview,
  }
}
