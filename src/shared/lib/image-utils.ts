import { toForwardSlashes } from "./path/normalizePath"

// Image extensions that can be thumbnailed
export const THUMBNAIL_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "bmp",
  "ico",
  "svg",
])

export function canShowThumbnail(extension: string | null): boolean {
  if (!extension) return false
  return THUMBNAIL_EXTENSIONS.has(extension.toLowerCase())
}

// Create a file:// URL for local images (works in Tauri)
export function getLocalImageUrl(path: string): string {
  // Convert Windows path to URL format
  const normalized = toForwardSlashes(path)
  return `file:///${normalized}`
}
