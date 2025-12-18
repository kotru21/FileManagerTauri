declare global {
  var __fm_lastFiles: import("@/shared/api/tauri").FileEntry[] | undefined
  var __fm_perfLog: Record<string, unknown> | undefined
  var __fm_renderCounts: { fileRows?: number } | undefined
  var __fm_lastNav: { id: string; path: string; t: number } | undefined
}

export {}
