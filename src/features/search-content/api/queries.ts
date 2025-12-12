import { useQuery } from "@tanstack/react-query"
import { commands, type SearchOptions } from "@/shared/api/tauri"
import { CACHE_TIME, SEARCH } from "@/shared/config"
import { unwrapResult } from "@/shared/lib"

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
    enabled: !!searchPath && query.length >= SEARCH.MIN_QUERY_LENGTH,
    staleTime: CACHE_TIME.SEARCH,
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
    enabled: !!searchPath && query.length >= SEARCH.MIN_QUERY_LENGTH,
    staleTime: CACHE_TIME.SEARCH,
  })
}

export function useSearch(options: SearchOptions, enabled: boolean) {
  return useQuery({
    queryKey: searchKeys.full(options),
    queryFn: async () => unwrapResult(await commands.searchFiles(options)),
    enabled: enabled && options.query.length >= SEARCH.MIN_QUERY_LENGTH,
    staleTime: CACHE_TIME.SEARCH,
  })
}
