const EXTENSION_MAP: Record<string, string[]> = {
  image: ["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp", "ico"],
  video: ["mp4", "avi", "mkv", "mov", "wmv", "webm"],
  audio: ["mp3", "wav", "ogg", "flac", "aac", "wma"],
  document: ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "odt"],
  text: ["txt", "md", "rtf", "csv", "log"],
  code: [
    "js",
    "ts",
    "jsx",
    "tsx",
    "py",
    "rs",
    "go",
    "java",
    "c",
    "cpp",
    "h",
    "css",
    "scss",
    "html",
    "json",
    "xml",
    "yaml",
    "yml",
    "toml",
  ],
  archive: ["zip", "rar", "7z", "tar", "gz", "bz2"],
  executable: ["exe", "msi", "bat", "cmd", "sh"],
};

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
  | "unknown";

export function getFileType(
  extension: string | null,
  isDir: boolean
): FileType {
  if (isDir) return "folder";
  if (!extension) return "unknown";

  const ext = extension.toLowerCase();
  for (const [type, extensions] of Object.entries(EXTENSION_MAP)) {
    if (extensions.includes(ext)) return type as FileType;
  }
  return "unknown";
}

export function getExtension(filename: string): string | null {
  const parts = filename.split(".");
  if (parts.length < 2) return null;
  return parts[parts.length - 1].toLowerCase();
}

export function getBasename(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  return parts[parts.length - 1] || path;
}

export function joinPath(...parts: string[]): string {
  return parts.join("\\").replace(/\\+/g, "\\");
}
