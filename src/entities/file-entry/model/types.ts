export type { DriveInfo, FileEntry } from "@/shared/api/tauri"

import type { FileEntry } from "@/shared/api/tauri"

export type SortField = "name" | "size" | "modified" | "type"
export type SortDirection = "asc" | "desc"

export interface SortConfig {
  field: SortField
  direction: SortDirection
}

export function sortEntries(entries: FileEntry[], config: SortConfig): FileEntry[] {
  return [...entries].sort((a, b) => {
    // Folders always first
    if (a.is_dir && !b.is_dir) return -1
    if (!a.is_dir && b.is_dir) return 1

    let comparison = 0

    switch (config.field) {
      case "name":
        comparison = a.name.localeCompare(b.name, "ru", {
          sensitivity: "base",
        })
        break
      case "size":
        comparison = a.size - b.size
        break
      case "modified":
        comparison = (a.modified ?? 0) - (b.modified ?? 0)
        break
      case "type":
        comparison = (a.extension ?? "").localeCompare(b.extension ?? "")
        break
    }

    return config.direction === "asc" ? comparison : -comparison
  })
}

export function filterEntries(
  entries: FileEntry[],
  options: {
    showHidden?: boolean
    extensions?: string[]
    searchQuery?: string
  },
): FileEntry[] {
  return entries.filter((entry) => {
    if (!options.showHidden && entry.is_hidden) return false

    if (options.extensions?.length && !entry.is_dir) {
      const ext = entry.extension?.toLowerCase()
      if (!ext || !options.extensions.includes(ext)) return false
    }

    if (options.searchQuery) {
      const query = options.searchQuery.toLowerCase()
      if (!entry.name.toLowerCase().includes(query)) return false
    }

    return true
  })
}
