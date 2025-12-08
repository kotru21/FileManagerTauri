import { create } from "zustand";

type ClipboardAction = "copy" | "cut";

interface ClipboardState {
  paths: string[];
  action: ClipboardAction | null;

  copy: (paths: string[]) => void;
  cut: (paths: string[]) => void;
  clear: () => void;
  hasContent: () => boolean;
  isCut: () => boolean;
}

export const useClipboardStore = create<ClipboardState>((set, get) => ({
  paths: [],
  action: null,

  copy: (paths) => set({ paths, action: "copy" }),
  cut: (paths) => set({ paths, action: "cut" }),
  clear: () => set({ paths: [], action: null }),
  hasContent: () => get().paths.length > 0,
  isCut: () => get().action === "cut",
}));
