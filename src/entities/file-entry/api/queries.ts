import { useQuery } from "@tanstack/react-query"
import { tauriClient } from "@/shared/api/tauri/client"
import { getLastNav, setPerfLog } from "@/shared/lib/devLogger"
import { markPerf, withPerf } from "@/shared/lib/perf"
import { fileKeys } from "./keys"

export function useDirectoryContents(path: string | null) {
  return useQuery({
    queryKey: fileKeys.directory(path),
    queryFn: async () => {
      if (!path) return []
      return withPerf("readDirectory", { path }, async () => {
        const start = performance.now()
        const entries = await tauriClient.readDirectory(path)
        const duration = performance.now() - start

        try {
          const last = getLastNav()
          if (last && last.path === path) {
            const navToRead = performance.now() - last.t
            markPerf("nav->readDirectory", { id: last.id, path, navToRead })
            setPerfLog({
              lastRead: {
                id: last.id,
                path,
                duration,
                navToRead,
                ts: Date.now(),
              },
            })
          } else {
            setPerfLog({ lastRead: { path, duration, ts: Date.now() } })
          }
        } catch {
          void 0
        }

        return entries
      })
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
