import type { FileEntry } from "@/shared/api/tauri"

export type SortField = "name" | "size" | "modified" | "type"
export type SortDirection = "asc" | "desc"

export interface SortConfig {
  field: SortField
  direction: SortDirection
}

export function sortEntries(entries: FileEntry[], config: SortConfig): FileEntry[] {
  const sorted = [...entries]

  sorted.sort((a, b) => {
    // Folders always first
    if (a.is_dir !== b.is_dir) {
      return a.is_dir ? -1 : 1
    }

    let comparison = 0

    switch (config.field) {
      case "name":
        comparison = a.name.toLowerCase().localeCompare(b.name.toLowerCase())
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

  return sorted
}

export function filterEntries(
  entries: FileEntry[],
  options: {
    showHidden?: boolean
    extensions?: string[]
    searchQuery?: string
  },
): FileEntry[] {
  const { showHidden = false, extensions, searchQuery } = options

  return entries.filter((entry) => {
    // Filter hidden files (default: hide them)
    if (!showHidden && entry.is_hidden) {
      return false
    }

    // Filter by extensions (case-insensitive, folders always pass)
    if (extensions && extensions.length > 0) {
      if (!entry.is_dir) {
        const entryExt = entry.extension?.toLowerCase()
        const hasMatchingExt = extensions.some((ext) => ext.toLowerCase() === entryExt)
        if (!hasMatchingExt) {
          return false
        }
      }
    }

    // Filter by search query (case-insensitive)
    if (searchQuery?.trim()) {
      if (!entry.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }
    }

    return true
  })
}
