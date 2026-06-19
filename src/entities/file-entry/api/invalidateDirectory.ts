import type { QueryClient } from "@tanstack/react-query"
import { getBasename } from "@/shared/lib"
import { fileKeys } from "./keys"

function parentDir(path: string): string {
  const normalized = path.replace(/\\/g, "/").replace(/\/+$/, "")
  const idx = normalized.lastIndexOf("/")
  if (idx <= 0) return normalized
  return normalized.slice(0, idx)
}

export function invalidateAffectedDirectories(
  queryClient: QueryClient,
  opts: { paths?: string[]; destination?: string; directory?: string },
) {
  const dirs = new Set<string>()
  if (opts.directory) dirs.add(opts.directory)
  if (opts.destination) dirs.add(opts.destination)
  for (const p of opts.paths ?? []) {
    dirs.add(parentDir(p))
    dirs.add(parentDir(`${opts.destination ?? ""}/${getBasename(p)}`))
  }
  for (const dir of dirs) {
    if (dir) {
      queryClient.invalidateQueries({ queryKey: fileKeys.directory(dir) })
    }
  }
}
