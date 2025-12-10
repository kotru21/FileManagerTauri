// =====================================
// Горячие клавиши
// =====================================
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

// =====================================
// Время кэширования (в миллисекундах)
// =====================================
export const CACHE_TIME = {
  /** Время кэширования содержимого директории */
  DIRECTORY: 30_000,
  /** Время кэширования списка дисков */
  DRIVES: 60_000,
  /** Время кэширования результатов поиска */
  SEARCH: 10_000,
} as const;

// =====================================
// Настройки поиска
// =====================================
export const SEARCH = {
  /** Минимальная длина поискового запроса */
  MIN_QUERY_LENGTH: 2,
  /** Интервал throttle для обновления прогресса (мс) */
  PROGRESS_THROTTLE_MS: 200,
} as const;

// =====================================
// Настройки виртуализации
// =====================================
export const VIRTUALIZATION = {
  /** Высота строки в списке файлов */
  ROW_HEIGHT: 32,
  /** Количество элементов за пределами viewport для плавного скролла */
  OVERSCAN: 10,
  /** Размер batch при стриминге директории */
  STREAM_BATCH_SIZE: 100,
} as const;

// =====================================
// Версии для persist storage
// =====================================
export const STORAGE_VERSIONS = {
  NAVIGATION: 1,
  LAYOUT: 1,
  FILE_SELECTION: 1,
} as const;

// =====================================
// Иконки файлов по расширению
// =====================================
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

// =====================================
// Настройки сортировки по умолчанию
// =====================================
export const DEFAULT_SORT = {
  field: "name" as const,
  direction: "asc" as const,
};

// =====================================
// Режимы отображения
// =====================================
export const VIEW_MODES = {
  list: "list",
  grid: "grid",
  details: "details",
} as const;

export type ViewMode = (typeof VIEW_MODES)[keyof typeof VIEW_MODES];
