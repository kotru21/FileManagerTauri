import { useQuery } from "@tanstack/react-query"
import { commands, type Result, type SearchOptions } from "@/shared/api/tauri"

// Helper to unwrap Result from tauri-specta
function unwrapResult<T, E>(result: Result<T, E>): T {
  if (result.status === "ok") {
    return result.data
  }
  throw new Error(String(result.error))
}

export const searchKeys = {
  all: ["search"] as const,
  byName: (path: string, query: string) => [...searchKeys.all, "name", path, query] as const,
  byContent: (path: string, query: string) => [...searchKeys.all, "content", path, query] as const,
  full: (options: SearchOptions) => [...searchKeys.all, "full", options] as const,
}

export function useSearchByName(searchPath: string, query: string, maxResults?: number) {
  return useQuery({
    queryKey: searchKeys.byName(searchPath, query),
    queryFn: async () =>
      unwrapResult(await commands.searchByName(searchPath, query, maxResults ?? null)),
    enabled: !!searchPath && query.length >= 2,
    staleTime: 10_000,
  })
}

export function useSearchContent(
  searchPath: string,
  query: string,
  extensions?: string[],
  maxResults?: number,
) {
  return useQuery({
    queryKey: searchKeys.byContent(searchPath, query),
    queryFn: async () =>
      unwrapResult(
        await commands.searchContent(searchPath, query, extensions ?? null, maxResults ?? null),
      ),
    enabled: !!searchPath && query.length >= 2,
    staleTime: 10_000,
  })
}

export function useSearch(options: SearchOptions, enabled: boolean) {
  return useQuery({
    queryKey: searchKeys.full(options),
    queryFn: async () => unwrapResult(await commands.searchFiles(options)),
    enabled: enabled && options.query.length >= 2,
    staleTime: 10_000,
  })
}
