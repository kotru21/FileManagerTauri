export function toForwardSlashes(input: string): string {
  return (input ?? "").replace(/\\/g, "/")
}

export function normalizePathForComparison(input: string): string {
  let s = (input ?? "").trim()
  if (!s) return ""

  // Normalize separators
  s = toForwardSlashes(s)

  // Strip Windows extended-length prefixes to avoid duplicate representations.
  // - \\?\C:\\Path -> C:/Path
  // - \\?\UNC\\server\\share -> //server/share
  if (s.startsWith("//?/UNC/")) {
    s = `//${s.slice("//?/UNC/".length)}`
  } else if (s.startsWith("//?/")) {
    s = s.slice("//?/".length)
  }

  // Collapse repeated slashes (preserve UNC prefix)
  const isUNC = s.startsWith("//")
  if (isUNC) {
    s = `//${s.slice(2).split("/").filter(Boolean).join("/")}`
  } else {
    s = s.replace(/\/+/g, "/")
  }

  // Trim trailing slashes (but keep POSIX root and Windows drive roots like "c:/")
  while (s.endsWith("/")) {
    if (s === "/") break
    if (/^[A-Za-z]:\/$/.test(s)) break
    s = s.slice(0, -1)
  }

  // Normalize drive letter casing (C: -> c:)
  s = s.replace(/^([A-Za-z]):/, (_m, drive: string) => `${drive.toLowerCase()}:`)

  // Windows/UNC paths are generally case-insensitive; normalize to lower-case to avoid duplicate keys.
  const windowsLike = /^([A-Za-z]):/.test(s) || s.startsWith("//")
  if (windowsLike) s = s.toLowerCase()

  return s
}
