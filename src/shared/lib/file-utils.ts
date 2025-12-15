export type FileType =
  | "folder"
  | "image"
  | "video"
  | "audio"
  | "document"
  | "text"
  | "code"
  | "archive"
  | "executable"
  | "unknown"

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp", "ico"]
const VIDEO_EXTENSIONS = ["mp4", "avi", "mkv", "mov", "wmv", "flv", "webm"]
const AUDIO_EXTENSIONS = ["mp3", "wav", "flac", "aac", "ogg", "wma", "m4a"]
const DOCUMENT_EXTENSIONS = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "odt"]
const CODE_EXTENSIONS = [
  "js",
  "ts",
  "jsx",
  "tsx",
  "html",
  "css",
  "json",
  "xml",
  "yaml",
  "yml",
  "py",
  "rs",
  "go",
  "java",
  "c",
  "cpp",
  "h",
  "hpp",
]
const TEXT_EXTENSIONS = ["txt", "md", "log", "ini", "cfg", "conf"]
const ARCHIVE_EXTENSIONS = ["zip", "rar", "7z", "tar", "gz", "bz2"]
const EXECUTABLE_EXTENSIONS = ["exe", "msi", "bat", "cmd", "sh"]

export function getFileType(extension: string | null, isDir: boolean): FileType {
  if (isDir) return "folder"
  if (!extension) return "unknown"

  const ext = extension.toLowerCase()

  if (IMAGE_EXTENSIONS.includes(ext)) return "image"
  if (VIDEO_EXTENSIONS.includes(ext)) return "video"
  if (AUDIO_EXTENSIONS.includes(ext)) return "audio"
  if (DOCUMENT_EXTENSIONS.includes(ext)) return "document"
  if (CODE_EXTENSIONS.includes(ext)) return "code"
  if (TEXT_EXTENSIONS.includes(ext)) return "text"
  if (ARCHIVE_EXTENSIONS.includes(ext)) return "archive"
  if (EXECUTABLE_EXTENSIONS.includes(ext)) return "executable"

  return "unknown"
}

export function getExtension(filename: string): string | null {
  if (!filename) return null

  const lastDot = filename.lastIndexOf(".")

  // No dot found
  if (lastDot === -1) return null
  // Dot at the end (like "file.")
  if (lastDot === filename.length - 1) return null
  // Only dot is at position 0 (hidden file without extension like ".gitignore")
  if (lastDot === 0) return null

  return filename.slice(lastDot + 1).toLowerCase()
}

export function getBasename(path: string): string {
  if (!path) return ""

  // Remove trailing separators
  const trimmed = path.replace(/[/\\]+$/, "")

  // After trimming, if empty or just a drive letter (C:), return empty
  if (!trimmed || /^[A-Za-z]:$/.test(trimmed)) return ""

  // Split and get last part
  const parts = trimmed.split(/[/\\]/)
  return parts[parts.length - 1] || ""
}

export function joinPath(...parts: string[]): string {
  return parts.filter(Boolean).join("/")
}
