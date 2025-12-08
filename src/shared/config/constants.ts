export const HOTKEYS = {
  copy: "ctrl+c",
  cut: "ctrl+x",
  paste: "ctrl+v",
  delete: "delete",
  rename: "f2",
  newFolder: "ctrl+shift+n",
  newFile: "ctrl+n",
  search: "ctrl+f",
  searchContent: "ctrl+shift+f",
  selectAll: "ctrl+a",
  refresh: "f5",
  back: "alt+left",
  forward: "alt+right",
  up: "alt+up",
  addressBar: "ctrl+l",
} as const;

export const FILE_ICONS_BY_EXTENSION: Record<string, string> = {
  // Images
  jpg: "image",
  jpeg: "image",
  png: "image",
  gif: "image",
  svg: "image",
  webp: "image",
  // Code
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  py: "python",
  rs: "rust",
  go: "go",
  // Documents
  pdf: "pdf",
  doc: "word",
  docx: "word",
  xls: "excel",
  xlsx: "excel",
  // Archives
  zip: "archive",
  rar: "archive",
  "7z": "archive",
  tar: "archive",
  gz: "archive",
};

export const DEFAULT_SORT = {
  field: "name" as const,
  direction: "asc" as const,
};

export const VIEW_MODES = {
  list: "list",
  grid: "grid",
  details: "details",
} as const;

export type ViewMode = (typeof VIEW_MODES)[keyof typeof VIEW_MODES];
