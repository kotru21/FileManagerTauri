import { create } from "zustand";
import type { SearchResult } from "@/shared/api/tauri";

export interface SearchProgress {
  scanned: number;
  found: number;
  currentPath: string;
}

interface SearchState {
  query: string;
  searchPath: string;
  searchContent: boolean;
  caseSensitive: boolean;
  isSearching: boolean;
  results: SearchResult[];
  progress: SearchProgress | null;
  shouldCancel: boolean;

  setQuery: (query: string) => void;
  setSearchPath: (path: string) => void;
  setSearchContent: (value: boolean) => void;
  setCaseSensitive: (value: boolean) => void;
  setIsSearching: (value: boolean) => void;
  setResults: (results: SearchResult[]) => void;
  setProgress: (progress: SearchProgress | null) => void;
  cancelSearch: () => void;
  reset: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  query: "",
  searchPath: "",
  searchContent: false,
  caseSensitive: false,
  isSearching: false,
  results: [],
  progress: null,
  shouldCancel: false,

  setQuery: (query) => set({ query }),
  setSearchPath: (searchPath) => set({ searchPath }),
  setSearchContent: (searchContent) => set({ searchContent }),
  setCaseSensitive: (caseSensitive) => set({ caseSensitive }),
  setIsSearching: (isSearching) => set({ isSearching }),
  setResults: (results) => set({ results }),
  setProgress: (progress) => set({ progress }),
  cancelSearch: () => set({ shouldCancel: true }),
  reset: () =>
    set({
      query: "",
      searchContent: false,
      caseSensitive: false,
      isSearching: false,
      results: [],
      progress: null,
      shouldCancel: false,
    }),
}));
