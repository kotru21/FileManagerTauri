import { listen } from "@tauri-apps/api/event"
import { useCallback, useEffect, useRef, useState } from "react"
import type { FileEntry } from "@/shared/api/tauri"
import { commands } from "@/shared/api/tauri"

export function useStreamingDirectory(path: string | null) {
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const previousPath = useRef<string | null>(null)
  const isInitialMount = useRef(true)

  // Сбрасываем состояние при изменении пути (без setState в эффекте)
  const shouldReset = path !== previousPath.current
  if (shouldReset && path) {
    previousPath.current = path
  }

  useEffect(() => {
    if (!path) return

    // При первом монтировании или изменении пути - сбрасываем
    if (isInitialMount.current || shouldReset) {
      isInitialMount.current = false
    }

    let cancelled = false
    const batchEntries: FileEntry[] = []

    // Очищаем предыдущие данные
    setEntries([])
    setIsLoading(true)

    const unlistenBatch = listen<FileEntry[]>("directory-batch", (event) => {
      if (cancelled) return
      batchEntries.push(...event.payload)
      setEntries([...batchEntries])
    })

    const unlistenComplete = listen<string>("directory-complete", () => {
      if (cancelled) return
      setIsLoading(false)
    })

    commands.readDirectoryStream(path)

    return () => {
      cancelled = true
      unlistenBatch.then((fn) => fn())
      unlistenComplete.then((fn) => fn())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, shouldReset])

  const refresh = useCallback(() => {
    if (path) {
      // Re-request the stream for the current path
      commands.readDirectoryStream(path)
    }
  }, [path])

  return { entries, isLoading, refresh }
}
