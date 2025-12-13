import { openPath } from "@tauri-apps/plugin-opener";
import { useCallback, useEffect, useState } from "react";
import {
  NewFileDialog,
  NewFolderDialog,
  RenameDialog,
  useFileOperations,
} from "@/features/file-dialogs";
import { useHomeStore } from "@/features/home";
import { useLayoutStore } from "@/features/layout";
import { useNavigationStore } from "@/features/navigation";
import {
  SearchBar,
  SearchResultItem,
  useSearchStore,
} from "@/features/search-content";
import { useRef } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  TooltipProvider,
} from "@/shared/ui";
import {
  Breadcrumbs,
  FileExplorer,
  Sidebar,
  StatusBar,
  Toolbar,
} from "@/widgets";
import { HomePanel } from "@/widgets/home";

export function FileBrowserPage() {
  const currentPath = useNavigationStore((s) => s.currentPath);

  const [showSearch, setShowSearch] = useState(false);

  // Используем хук для файловых операций
  const {
    newFolderDialog,
    newFileDialog,
    renameDialog,
    handleNewFolder,
    handleNewFile,
    handleRenameRequest,
    handleCreateFolder,
    handleCreateFile,
    handleRename,
    handleRefresh,
    isCreatingFolder,
    isCreatingFile,
    isRenaming,
  } = useFileOperations({ currentPath });

  const {
    searchPath,
    setSearchPath,
    results: searchResults,
    clearSearch,
  } = useSearchStore();

  useEffect(() => {
    if (currentPath) {
      setSearchPath(currentPath);
    }
  }, [currentPath, setSearchPath]);

  const handleSearchToggle = useCallback(() => {
    setShowSearch((prev) => {
      const newValue = !prev;
      // При закрытии поиска очищаем результаты
      if (!newValue) {
        clearSearch();
      }
      return newValue;
    });
    if (currentPath) {
      setSearchPath(currentPath);
    }
  }, [currentPath, setSearchPath, clearSearch]);

  const handleResultSelect = useCallback(
    async (path: string, isDir?: boolean, name?: string) => {
      // Сначала очищаем поиск и скрываем панель
      clearSearch();
      setShowSearch(false);

      // Отслеживаем открытие в home store
      useHomeStore.getState().trackOpen(path, !!isDir, name);

      // Затем выполняем навигацию или открытие файла
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
    [clearSearch]
  );

  const searchSelectHandlerCache = useRef<Map<string, () => void>>(new Map());
  const getSearchHandler = useCallback(
    (path: string, isDir?: boolean, name?: string) => {
      const cached = searchSelectHandlerCache.current.get(path);
      if (cached) return cached;
      const fn = () => handleResultSelect(path, isDir, name);
      searchSelectHandlerCache.current.set(path, fn);
      return fn;
    },
    [handleResultSelect]
  );

  const handleCloseSearchResults = useCallback(() => {
    clearSearch();
  }, [clearSearch]);

  return (
    <TooltipProvider>
      <div
        className="flex flex-col h-screen bg-background text-foreground"
        role="application"
        aria-label="Файловый менеджер">
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

        {/* Search Bar - фиксированная позиция */}
        {showSearch && (
          <div className="px-4 py-2 border-b" role="search">
            <SearchBar
              className="max-w-xl"
              onSearch={() => {
                if (!searchPath && currentPath) {
                  setSearchPath(currentPath);
                }
              }}
            />
          </div>
        )}

        {/* Main Content - relative для overlay */}
        <div className="flex-1 overflow-hidden relative">
          {/* Search Results Overlay */}
          {showSearch && searchResults.length > 0 && (
            <div
              className="absolute top-0 left-0 right-0 z-40 mx-4 mt-2"
              role="listbox"
              aria-label="Результаты поиска">
              <div className="border rounded-lg shadow-xl bg-background/95 backdrop-blur-sm overflow-hidden max-w-2xl">
                <div className="px-3 py-1.5 border-b bg-muted/50 text-xs text-muted-foreground flex justify-between items-center">
                  <span>Найдено: {searchResults.length}</span>
                  <button
                    type="button"
                    onClick={handleCloseSearchResults}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Закрыть результаты поиска">
                    Закрыть
                  </button>
                </div>
                <div className="max-h-80 overflow-auto divide-y">
                  {searchResults.map((result) => (
                    <SearchResultItem
                      key={result.path}
                      result={result}
                      onSelect={getSearchHandler(
                        result.path,
                        result.is_dir,
                        result.name
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          <ResizablePanelGroup
            direction="horizontal"
            className="h-full"
            onLayout={(sizes) => {
              if (sizes.length >= 2) {
                // Guard to avoid unnecessary store updates which can cause
                // re-render loops: only set layout when values actually changed
                const current = useLayoutStore.getState().layout;
                const newSidebar = sizes[0];
                const newMain = sizes[1];
                if (
                  current.sidebarSize !== newSidebar ||
                  current.mainPanelSize !== newMain
                ) {
                  useLayoutStore.getState().setLayout({
                    sidebarSize: newSidebar,
                    mainPanelSize: newMain,
                  });
                }
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
              <main
                className="flex-1 flex flex-col overflow-hidden h-full"
                aria-label="Содержимое директории">
                {currentPath === null ? (
                  <HomePanel />
                ) : (
                  <FileExplorer
                    showHidden={false}
                    onRenameRequest={handleRenameRequest}
                    onNewFolderRequest={handleNewFolder}
                    onNewFileRequest={handleNewFile}
                    className="flex-1"
                  />
                )}
              </main>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>

        {/* Status Bar */}
        <StatusBar />

        {/* Dialogs */}
        <NewFolderDialog
          isOpen={newFolderDialog.state.isOpen}
          value={newFolderDialog.state.value}
          onValueChange={newFolderDialog.setValue}
          onOpenChange={newFolderDialog.setOpen}
          onSubmit={handleCreateFolder}
          isLoading={isCreatingFolder}
        />

        <NewFileDialog
          isOpen={newFileDialog.state.isOpen}
          value={newFileDialog.state.value}
          onValueChange={newFileDialog.setValue}
          onOpenChange={newFileDialog.setOpen}
          onSubmit={handleCreateFile}
          isLoading={isCreatingFile}
        />

        <RenameDialog
          isOpen={renameDialog.state.isOpen}
          value={renameDialog.state.value}
          onValueChange={renameDialog.setValue}
          onOpenChange={renameDialog.setOpen}
          onSubmit={handleRename}
          isLoading={isRenaming}
        />
      </div>
    </TooltipProvider>
  );
}
