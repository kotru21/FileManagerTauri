export function getDirname(path: string): string {
  const normalized = (path ?? "").replace(/\\/g, "/").replace(/\/+$/, "")
  if (!normalized) return ""
  const idx = normalized.lastIndexOf("/")
  if (idx === -1) return ""
  if (idx === 0) return "/"
  return normalized.slice(0, idx)
}
