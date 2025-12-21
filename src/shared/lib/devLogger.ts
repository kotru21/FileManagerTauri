import type { FileEntry } from "@/shared/api/tauri"
import { isPerfEnabled } from "./perf"

export function setPerfLog(partial: Record<string, unknown>) {
  if (!isPerfEnabled()) return
  try {
    ;(globalThis as unknown as { __fm_perfLog?: Record<string, unknown> }).__fm_perfLog = {
      ...((globalThis as unknown as { __fm_perfLog?: Record<string, unknown> }).__fm_perfLog ?? {}),
      ...partial,
    }
  } catch {
    /* ignore */
  }
}

export function getPerfLog(): Record<string, unknown> | undefined {
  try {
    return (globalThis as unknown as { __fm_perfLog?: Record<string, unknown> }).__fm_perfLog
  } catch {
    return undefined
  }
}

export function setLastFiles(files: FileEntry[] | undefined) {
  if (!isPerfEnabled()) return
  try {
    ;(globalThis as unknown as { __fm_lastFiles?: FileEntry[] | undefined }).__fm_lastFiles = files
  } catch {
    /* ignore */
  }
}

export function getLastFiles(): FileEntry[] | undefined {
  try {
    return (globalThis as unknown as { __fm_lastFiles?: FileEntry[] | undefined }).__fm_lastFiles
  } catch {
    return undefined
  }
}

export function setLastNav(nav: { id: string; path: string; t: number } | undefined) {
  if (!isPerfEnabled()) return
  try {
    ;(
      globalThis as unknown as {
        __fm_lastNav?: { id: string; path: string; t: number } | undefined
      }
    ).__fm_lastNav = nav
  } catch {
    /* ignore */
  }
}

export function getLastNav(): { id: string; path: string; t: number } | undefined {
  try {
    return (
      globalThis as unknown as {
        __fm_lastNav?: { id: string; path: string; t: number } | undefined
      }
    ).__fm_lastNav
  } catch {
    return undefined
  }
}
