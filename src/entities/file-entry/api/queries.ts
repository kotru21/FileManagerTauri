import { useQuery } from "@tanstack/react-query"
import { tauriClient } from "@/shared/api/tauri/client"
import { fileKeys } from "./keys"

export function useDirectoryContents(path: string | null) {
  return useQuery({
    queryKey: fileKeys.directory(path),
    queryFn: async () => {
      if (!path) return []
      const start = performance.now()
      try {
        const entries = await tauriClient.readDirectory(path)
        const duration = performance.now() - start
        try {
          console.debug(`[perf] readDirectory`, { path, duration })

          const last = globalThis.__fm_lastNav
          if (last && last.path === path) {
            const navToRead = performance.now() - last.t
            console.debug(`[perf] nav->readDirectory`, { id: last.id, path, navToRead })
            globalThis.__fm_perfLog = {
              ...(globalThis.__fm_perfLog ?? {}),
              lastRead: { id: last.id, path, duration, navToRead, ts: Date.now() },
            }
          } else {
            globalThis.__fm_perfLog = {
              ...(globalThis.__fm_perfLog ?? {}),
              lastRead: { path, duration, ts: Date.now() },
            }
          }
        } catch {
          /* ignore */
        }

        return entries
      } catch (err) {
        const duration = performance.now() - start
        try {
          console.debug(`[perf] readDirectory`, { path, duration, error: String(err) })
        } catch {
          /* ignore */
        }
        throw err
      }
    },
    enabled: !!path,
    staleTime: 30_000,
  })
}

export function useDrives() {
  return useQuery({
    queryKey: fileKeys.drives(),
    queryFn: async () => {
      return tauriClient.getDrives()
    },
    staleTime: 60_000,
  })
}

export { fileKeys }
