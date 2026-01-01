import { type EventCallback, listen, type UnlistenFn } from "@tauri-apps/api/event"

import type { FileEntry, SearchResult } from "./bindings"

export type FsChangeEvent = {
  kind: string
  paths: string[]
}

export type SearchProgressEvent = {
  scanned: number
  found: number
  current_path: string
}

export type SearchBatchEvent = SearchResult[]

export type SearchCompleteEvent = number

export type CopyProgressEvent = {
  current: number
  total: number
  file: string
}

export type DirectoryBatchEvent = {
  path: string
  request_id: string
  entries: FileEntry[]
}

export type DirectoryCompleteEvent = {
  path: string
  request_id: string
}

/**
 * Typed wrappers around Tauri events emitted by the Rust backend.
 *
 * Why this exists:
 * - tauri-specta generates commands & types, but not our custom event names/payloads.
 * - Centralizing event contracts reduces "stringly-typed" drift between Rust and TS.
 */
export const tauriEvents = {
  fsChange(cb: EventCallback<FsChangeEvent>): Promise<UnlistenFn> {
    return listen<FsChangeEvent>("fs-change", cb)
  },

  searchProgress(cb: EventCallback<SearchProgressEvent>): Promise<UnlistenFn> {
    return listen<SearchProgressEvent>("search-progress", cb)
  },

  searchBatch(cb: EventCallback<SearchBatchEvent>): Promise<UnlistenFn> {
    return listen<SearchBatchEvent>("search-batch", cb)
  },

  searchComplete(cb: EventCallback<SearchCompleteEvent>): Promise<UnlistenFn> {
    return listen<SearchCompleteEvent>("search-complete", cb)
  },

  directoryBatch(cb: EventCallback<DirectoryBatchEvent>): Promise<UnlistenFn> {
    return listen<DirectoryBatchEvent>("directory-batch", cb)
  },

  directoryComplete(cb: EventCallback<DirectoryCompleteEvent>): Promise<UnlistenFn> {
    return listen<DirectoryCompleteEvent>("directory-complete", cb)
  },

  copyProgress(cb: EventCallback<CopyProgressEvent>): Promise<UnlistenFn> {
    return listen<CopyProgressEvent>("copy-progress", cb)
  },
} as const
