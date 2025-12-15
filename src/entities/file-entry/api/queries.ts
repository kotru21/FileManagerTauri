import { useQuery } from "@tanstack/react-query"
import { commands, type Result } from "@/shared/api/tauri"
import { fileKeys } from "./keys"

function unwrapResult<T, E>(result: Result<T, E>): T {
  if (result.status === "ok") {
    return result.data
  }
  throw new Error(String(result.error))
}

export function useDirectoryContents(path: string | null) {
  return useQuery({
    queryKey: fileKeys.directory(path),
    queryFn: async () => {
      if (!path) return []
      const result = await commands.readDirectory(path)
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
