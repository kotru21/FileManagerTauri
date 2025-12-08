import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  FileExplorer,
  Breadcrumbs,
  Toolbar,
  Sidebar,
  StatusBar,
} from "@/widgets";
import { SearchBar, useSearchStore } from "@/features/search-content";
import { useNavigationStore } from "@/features/navigation";
import {
  useCreateDirectory,
  useCreateFile,
  useRenameEntry,
  fileKeys,
} from "@/entities/file-entry";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  TooltipProvider,
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

  const { setSearchPath } = useSearchStore();

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
          <div className="px-4 py-2 border-b">
            <SearchBar className="max-w-xl" />
          </div>
        )}

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          <Sidebar className="w-48 shrink-0" />

          <main className="flex-1 flex flex-col overflow-hidden">
            <FileExplorer
              showHidden={false}
              onRenameRequest={handleRenameRequest}
              onNewFolderRequest={handleNewFolder}
              onNewFileRequest={handleNewFile}
              className="flex-1"
            />
          </main>
        </div>

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
