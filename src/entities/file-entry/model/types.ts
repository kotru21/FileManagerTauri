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
    if (a.is_dir !== b.is_dir) {
      return a.is_dir ? -1 : 1
    }

    let comparison = 0
    switch (config.field) {
      case "name":
        comparison = a.name.localeCompare(b.name, undefined, {
          numeric: true,
          sensitivity: "base",
        })
        break
      case "size":
        comparison = (a.size ?? 0) - (b.size ?? 0)
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

export interface FilterOptions {
  showHidden?: boolean
  extensions?: string[]
  searchQuery?: string
}

export function filterEntries(entries: FileEntry[], options: FilterOptions): FileEntry[] {
  const { showHidden = false, extensions, searchQuery } = options

  return entries.filter((entry) => {
    // Filter hidden files (default: hide them)
    if (!showHidden && entry.is_hidden) {
      return false
    }

    // Filter by extensions (case-insensitive, folders always pass)
    if (extensions?.length && !entry.is_dir) {
      const ext = entry.extension?.toLowerCase()
      if (!ext || !extensions.some((e) => e.toLowerCase() === ext)) {
        return false
      }
    }

    // Filter by search query (case-insensitive)
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      if (!entry.name.toLowerCase().includes(query)) {
        return false
      }
    }

    return true
  })
}
