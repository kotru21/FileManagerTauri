import { File, Folder, Loader2 } from "lucide-react"
import { FileThumbnail } from "@/entities/file-entry/ui/FileThumbnail"
import type { FileEntry } from "@/shared/api/tauri"
import { getExtension } from "@/shared/lib"
import { Button } from "@/shared/ui"
import type { UseFolderPreviewReturn } from "../lib/useFolderPreview"

export default function FolderPreview({
  file,
  hook,
}: {
  file: FileEntry
  hook: UseFolderPreviewReturn
}) {
  const {
    entries,
    currentPath,
    isLoadingEntries,
    error,
    handleEnterFolder,
    handleShowFile,
    handleToggleUp,
    handleOpenExternal,
    pathStack,
  } = hook

  const folderDisplayName =
    file.name && file.name.length > 24 ? `${file.name.slice(0, 24)}…` : file.name

  return (
    <div className="flex h-full flex-col items-start p-4 text-muted-foreground">
      <div className="flex items-center gap-3 w-full mb-3">
        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
          <Folder className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium truncate leading-tight whitespace-nowrap" title={file.name}>
            {folderDisplayName}
          </h4>
          <p className="text-xs text-muted-foreground truncate">{currentPath}</p>
        </div>
        <div className="flex items-center gap-2">
          {pathStack.length > 1 && (
            <button type="button" className="btn-ghost text-xs" onClick={handleToggleUp}>
              ◀ Назад
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 w-full overflow-auto">
        {isLoadingEntries ? (
          <div className="flex items-center justify-center w-full py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-sm text-muted-foreground">{error}</div>
        ) : entries && entries.length > 0 ? (
          <ul className="space-y-2 w-full">
            {entries.map((entry: FileEntry) => (
              <li key={entry.path} className="flex items-center justify-between group min-w-0">
                <div className="flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => {
                      entry.is_dir ? handleEnterFolder(entry) : handleShowFile(entry)
                    }}
                    className="text-left w-full p-2 rounded hover:bg-muted/30"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 shrink-0 flex items-center justify-center">
                        {entry.is_dir ? (
                          <Folder className="h-5 w-5" />
                        ) : (
                          <FileThumbnail
                            path={entry.path}
                            extension={getExtension(entry.name)}
                            isDir={false}
                            size={32}
                            performanceSettings={{ lazyLoadImages: false, thumbnailCacheSize: 10 }}
                            thumbnailGenerator={{ maxSide: 64 }}
                          />
                        )}
                      </div>
                      <span className="truncate whitespace-nowrap" title={entry.name}>
                        {entry.name}
                      </span>
                    </div>
                  </button>
                </div>
                {!entry.is_dir && (
                  <div className="ml-2 opacity-0 group-hover:opacity-100 transition">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="open-file"
                      data-testid="open-file"
                      onClick={(ev) => {
                        ev.stopPropagation()
                        handleOpenExternal(entry.path)
                      }}
                    >
                      <File className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-sm text-muted-foreground">Пустая папка</div>
        )}
      </div>
    </div>
  )
}
