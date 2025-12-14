import { FileIcon } from "@/entities/file-entry"
import type { ContentMatch, SearchResult } from "@/shared/api/tauri"
import { getExtension } from "@/shared/lib"

interface SearchResultItemProps {
  result: SearchResult
  onSelect: (path: string) => void
}

export function SearchResultItem({ result, onSelect }: SearchResultItemProps) {
  const extension = getExtension(result.name)

  return (
    <button
      type="button"
      className="border-b border-border last:border-b-0 hover:bg-accent/50 cursor-pointer w-full text-left"
      onClick={() => onSelect(result.path)}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <FileIcon extension={extension} isDir={result.is_dir} size={16} />
        <span className="font-medium text-sm truncate">{result.name}</span>
        <span className="text-xs text-muted-foreground truncate ml-auto">{result.path}</span>
      </div>

      {result.matches.length > 0 && (
        <div className="px-3 pb-2 space-y-1">
          {result.matches.slice(0, 3).map((match) => (
            <MatchPreview
              key={`${match.line_number}-${match.match_start}-${match.match_end}`}
              match={match}
            />
          ))}
          {result.matches.length > 3 && (
            <div className="text-xs text-muted-foreground">
              +{result.matches.length - 3} совпадений
            </div>
          )}
        </div>
      )}
    </button>
  )
}

function MatchPreview({ match }: { match: ContentMatch }) {
  const before = match.line_content.slice(0, match.match_start)
  const highlighted = match.line_content.slice(match.match_start, match.match_end)
  const after = match.line_content.slice(match.match_end)

  return (
    <div className="text-xs bg-muted/50 rounded px-2 py-1 font-mono overflow-hidden">
      <span className="text-muted-foreground mr-2">{match.line_number}:</span>
      <span className="text-muted-foreground">{before}</span>
      <span className="bg-yellow-200 dark:bg-yellow-900 text-yellow-900 dark:text-yellow-200 rounded px-0.5">
        {highlighted}
      </span>
      <span className="text-muted-foreground">{after}</span>
    </div>
  )
}
