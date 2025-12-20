import { useQuery } from "@tanstack/react-query"
import { commands } from "@/shared/api/tauri"
import { fileKeys } from "./keys"

import { unwrapResult } from "@/shared/api/tauri/client"

export function useDirectoryContents(path: string | null) {
  return useQuery({
    queryKey: fileKeys.directory(path),
    queryFn: async () => {
      if (!path) return []
      const start = performance.now()
      const result = await commands.readDirectory(path)
      const duration = performance.now() - start
      try {
        console.debug(`[perf] readDirectory`, { path, duration, status: result.status })

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

      return unwrapResult(result)
    },
    enabled: !!path,
    staleTime: 30_000,
  })
}

export function useDrives() {
  return useQuery({
    queryKey: fileKeys.drives(),
    queryFn: async () => {
      const result = await commands.getDrives()
      return unwrapResult(result)
    },
    staleTime: 60_000,
  })
}

export { fileKeys }
