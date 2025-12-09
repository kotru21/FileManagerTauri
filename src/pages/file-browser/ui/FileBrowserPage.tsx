import { useState, useCallback, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  FileExplorer,
  Breadcrumbs,
  Toolbar,
  Sidebar,
  StatusBar,
} from "@/widgets";
import {
  SearchBar,
  useSearchStore,
  useSearch,
} from "@/features/search-content";
import { useNavigationStore } from "@/features/navigation";
import { useLayoutStore } from "@/features/layout";
import {
  useCreateDirectory,
  useCreateFile,
  useRenameEntry,
  fileKeys,
} from "@/entities/file-entry";
import { SearchResultItem } from "@/features/search-content";
import { type SearchOptions } from "@/shared/api/tauri";
import { openPath } from "@tauri-apps/plugin-opener";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  TooltipProvider,
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/shared/ui";
import { joinPath, getBasename } from "@/shared/lib";

export function FileBrowserPage() {
  const queryClient = useQueryClient();
  const currentPath = useNavigationStore((s) => s.currentPath);

  const [showSearch, setShowSearch] = useState(false);
  const [newFolderDialog, setNewFolderDialog] = useState(false);
  const [newFileDialog, setNewFileDialog] = useState(false);
  const [renameDialog, setRenameDialog] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");

  const createDirectory = useCreateDirectory();
  const createFile = useCreateFile();
  const renameEntry = useRenameEntry();

  const {
    query,
    searchContent,
    searchPath,
    setSearchPath,
  } = useSearchStore();

  useEffect(() => {
    if (currentPath) {
      setSearchPath(currentPath);
    }
  }, [currentPath, setSearchPath]);

  const searchOptions: SearchOptions | null = useMemo(() => {
    if (!searchPath || query.length < 2) return null;
    return {
      query,
      search_path: searchPath,
      search_content: searchContent,
      case_sensitive: false,
      max_results: 500,
      file_extensions: null,
    };
  }, [query, searchPath, searchContent]);

  const { data: searchResults = [], isFetching: isSearching } = useSearch(
    searchOptions as SearchOptions,
    !!searchOptions && showSearch
  );

  const handleRefresh = useCallback(() => {
    if (currentPath) {
      queryClient.invalidateQueries({
        queryKey: fileKeys.directory(currentPath),
      });
    }
  }, [currentPath, queryClient]);

  const handleNewFolder = useCallback(() => {
    setInputValue("Новая папка");
    setNewFolderDialog(true);
  }, []);

  const handleNewFile = useCallback(() => {
    setInputValue("Новый файл.txt");
    setNewFileDialog(true);
  }, []);

  const handleCreateFolder = useCallback(async () => {
    if (!currentPath || !inputValue.trim()) return;
    try {
      await createDirectory.mutateAsync(
        joinPath(currentPath, inputValue.trim())
      );
      setNewFolderDialog(false);
      setInputValue("");
    } catch (error) {
      console.error("Failed to create folder:", error);
    }
  }, [currentPath, inputValue, createDirectory]);

  const handleCreateFile = useCallback(async () => {
    if (!currentPath || !inputValue.trim()) return;
    try {
      await createFile.mutateAsync(joinPath(currentPath, inputValue.trim()));
      setNewFileDialog(false);
      setInputValue("");
    } catch (error) {
      console.error("Failed to create file:", error);
    }
  }, [currentPath, inputValue, createFile]);

  const handleRename = useCallback(async () => {
    if (!renameDialog || !inputValue.trim()) return;
    try {
      await renameEntry.mutateAsync({
        oldPath: renameDialog,
        newName: inputValue.trim(),
      });
      setRenameDialog(null);
      setInputValue("");
    } catch (error) {
      console.error("Failed to rename:", error);
    }
  }, [renameDialog, inputValue, renameEntry]);

  const handleRenameRequest = useCallback((path: string) => {
    setInputValue(getBasename(path));
    setRenameDialog(path);
  }, []);

  const handleSearchToggle = useCallback(() => {
    setShowSearch((prev) => !prev);
    if (currentPath) {
      setSearchPath(currentPath);
    }
  }, [currentPath, setSearchPath]);

  const handleResultSelect = useCallback(
    async (path: string, isDir?: boolean) => {
      if (isDir === true) {
        useNavigationStore.getState().navigate(path);
      } else {
        try {
          await openPath(path);
        } catch (error) {
          console.error("Failed to open file from search result:", error);
        }
      }
    },
    []
  );

  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen bg-background text-foreground">
        {/* Header */}
        <header className="flex items-center gap-4 px-4 py-2 border-b">
          <Toolbar
            onRefresh={handleRefresh}
            onNewFolder={handleNewFolder}
            onNewFile={handleNewFile}
            onSearch={handleSearchToggle}
          />
          <Breadcrumbs className="flex-1" />
        </header>

        {/* Search Bar */}
        {showSearch && (
          <div className="px-4 py-2 border-b space-y-3">
            <SearchBar
              className="max-w-xl"
              onSearch={() => {
                if (!searchPath && currentPath) {
                  setSearchPath(currentPath);
                }
              }}
            />

            <div className="border rounded-md overflow-hidden bg-muted/10">
              {isSearching && (
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  Поиск...
                </div>
              )}

              {!isSearching && searchResults.length === 0 && query.length >= 2 && (
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  Ничего не найдено.
                </div>
              )}

              {!isSearching && searchResults.length > 0 && (
                <div className="max-h-80 overflow-auto divide-y">
                  {searchResults.map((result) => (
                    <SearchResultItem
                      key={result.path}
                      result={result}
                      onSelect={() => handleResultSelect(result.path, result.is_dir)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Content */}
        <ResizablePanelGroup
          direction="horizontal"
          className="flex-1 overflow-hidden"
          onLayout={(sizes) => {
            if (sizes.length >= 2) {
              useLayoutStore.getState().setLayout({
                sidebarSize: sizes[0],
                mainPanelSize: sizes[1],
              });
            }
          }}>
          <ResizablePanel
            defaultSize={useLayoutStore.getState().layout.sidebarSize}
            minSize={10}
            maxSize={40}
            collapsible>
            <Sidebar className="h-full" />
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel
            defaultSize={useLayoutStore.getState().layout.mainPanelSize}
            minSize={30}>
            <main className="flex-1 flex flex-col overflow-hidden h-full">
              <FileExplorer
                showHidden={false}
                onRenameRequest={handleRenameRequest}
                onNewFolderRequest={handleNewFolder}
                onNewFileRequest={handleNewFile}
                className="flex-1"
              />
            </main>
          </ResizablePanel>
        </ResizablePanelGroup>

        {/* Status Bar */}
        <StatusBar />

        {/* New Folder Dialog */}
        <Dialog open={newFolderDialog} onOpenChange={setNewFolderDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Новая папка</DialogTitle>
            </DialogHeader>
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Имя папки"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
            />
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setNewFolderDialog(false)}>
                Отмена
              </Button>
              <Button
                onClick={handleCreateFolder}
                disabled={!inputValue.trim()}>
                Создать
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* New File Dialog */}
        <Dialog open={newFileDialog} onOpenChange={setNewFileDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Новый файл</DialogTitle>
            </DialogHeader>
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Имя файла"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleCreateFile()}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setNewFileDialog(false)}>
                Отмена
              </Button>
              <Button onClick={handleCreateFile} disabled={!inputValue.trim()}>
                Создать
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Rename Dialog */}
        <Dialog
          open={!!renameDialog}
          onOpenChange={() => setRenameDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Переименовать</DialogTitle>
            </DialogHeader>
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Новое имя"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleRename()}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setRenameDialog(null)}>
                Отмена
              </Button>
              <Button onClick={handleRename} disabled={!inputValue.trim()}>
                Переименовать
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
