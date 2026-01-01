import { useEffect, useMemo, useState } from "react"
import {
  filterEntries,
  sortEntries,
  useCopyEntries,
  useCreateDirectory,
  useCreateFile,
  useDeleteEntries,
  useDirectoryContents,
  useMoveEntries,
  useRenameEntry,
  useStreamingDirectory,
} from "@/entities/file-entry"
import { useAppearanceSettings, useFileDisplaySettings } from "@/features/settings"
import { useSortingStore } from "@/features/sorting"
import type { FileEntry } from "@/shared/api/tauri"
import { getLastNav, setLastFiles, setPerfLog } from "@/shared/lib/devLogger"
import { withPerfSync } from "@/shared/lib/perf"
import { useFileExplorerHandlers } from "./useFileExplorerHandlers"

export function useFileExplorerLogic(
  currentPath: string | null,
  onQuickLook?: (file: FileEntry) => void,
  onFilesChange?: (files: FileEntry[]) => void,
) {
  const displaySettings = useFileDisplaySettings()
  const appearance = useAppearanceSettings()

  const dirQuery = useDirectoryContents(currentPath)
  const stream = useStreamingDirectory(currentPath)

  const rawFiles = stream.entries.length > 0 ? stream.entries : dirQuery.data
  const isLoading = dirQuery.isLoading || stream.isLoading
  const refetch = dirQuery.refetch

  const { sortConfig, setSortField } = useSortingStore()

  const processedFiles = useMemo(() => {
    if (!rawFiles) return []
    const filtered = filterEntries(rawFiles, { showHidden: displaySettings.showHiddenFiles })
    const sorted = sortEntries(filtered, sortConfig)
    return sorted
  }, [rawFiles, displaySettings.showHiddenFiles, sortConfig])
  useEffect(() => {
    try {
      setPerfLog({
        lastProcess: { path: currentPath, count: processedFiles.length, ts: Date.now() },
      })
    } catch {
      void 0
    }
  }, [processedFiles.length, currentPath])
  useEffect(() => {
    try {
      onFilesChange?.(processedFiles)
    } catch {
      void 0
    }

    try {
      setLastFiles(processedFiles)
    } catch {
      void 0
    }

    try {
      const last = getLastNav()
      if (last) {
        withPerfSync(
          "nav->render",
          { id: last.id, path: last.path, filesCount: processedFiles.length },
          () => {
            const now = performance.now()
            const navToRender = now - last.t
            setPerfLog({
              lastRender: {
                id: last.id,
                path: last.path,
                navToRender,
                filesCount: processedFiles.length,
                ts: Date.now(),
              },
            })
          },
        )
      } else {
        withPerfSync("nav->render", { filesCount: processedFiles.length }, () => {
          setPerfLog({ lastRender: { filesCount: processedFiles.length, ts: Date.now() } })
        })
      }
    } catch {
      void 0
    }
  }, [processedFiles, onFilesChange])

  const [copyDialogOpen, setCopyDialogOpen] = useState(false)
  const [copySource, setCopySource] = useState<string[]>([])
  const [copyDestination, setCopyDestination] = useState("")

  const { mutateAsync: createDirectory } = useCreateDirectory()
  const { mutateAsync: createFile } = useCreateFile()
  const { mutateAsync: renameEntry } = useRenameEntry()
  const { mutateAsync: deleteEntries } = useDeleteEntries()
  const { mutateAsync: copyEntries } = useCopyEntries()
  const { mutateAsync: moveEntries } = useMoveEntries()

  const handlers = useFileExplorerHandlers({
    files: processedFiles,
    createDirectory: async (path: string) => {
      await createDirectory(path)
    },
    createFile: async (path: string) => {
      await createFile(path)
    },
    renameEntry: async ({ oldPath, newName }) => {
      await renameEntry({ oldPath, newName })
    },
    deleteEntries: async ({ paths, permanent }) => {
      await deleteEntries({ paths, permanent })
    },
    copyEntries: async ({ sources, destination }) => {
      await copyEntries({ sources, destination })
    },
    moveEntries: async ({ sources, destination }) => {
      await moveEntries({ sources, destination })
    },
    onStartCopyWithProgress: (sources: string[], destination: string) => {
      setCopySource(sources)
      setCopyDestination(destination)
      setCopyDialogOpen(true)
    },
    onQuickLook,
  })

  return {
    files: processedFiles,
    processedFilesCount: processedFiles.length,
    isLoading,
    refetch,
    handlers,
    copyDialogOpen,
    setCopyDialogOpen,
    copySource,
    copyDestination,
    setCopySource,
    setCopyDestination,
    displaySettings,
    appearance,
    sortConfig,
    setSortField,
  }
}
