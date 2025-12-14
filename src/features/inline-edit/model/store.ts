import { create } from "zustand";

export type InlineEditMode = "new-folder" | "new-file" | "rename" | null;

interface InlineEditState {
  mode: InlineEditMode;
  targetPath: string | null; // для rename - путь к файлу
  parentPath: string | null; // для new - путь к папке

  startNewFolder: (parentPath: string) => void;
  startNewFile: (parentPath: string) => void;
  startRename: (targetPath: string) => void;
  cancel: () => void;
  reset: () => void;
}

export const useInlineEditStore = create<InlineEditState>((set) => ({
  mode: null,
  targetPath: null,
  parentPath: null,

  startNewFolder: (parentPath) =>
    set({ mode: "new-folder", parentPath, targetPath: null }),

  startNewFile: (parentPath) =>
    set({ mode: "new-file", parentPath, targetPath: null }),

  startRename: (targetPath) =>
    set({ mode: "rename", targetPath, parentPath: null }),

  cancel: () => set({ mode: null, targetPath: null, parentPath: null }),

  reset: () => set({ mode: null, targetPath: null, parentPath: null }),
}));
