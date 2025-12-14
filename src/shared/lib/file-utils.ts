const EXTENSION_MAP: Record<string, string[]> = {
  pdf: ["pdf"],
  spreadsheet: ["xls", "xlsx", "xlsm", "ods"],
  presentation: ["ppt", "pptx", "key"],
  image: ["jpg", "jpeg", "png", "gif", "bmp", "webp", "ico"],
  vector: ["svg", "eps", "ai"],
  video: ["mp4", "avi", "mkv", "mov", "wmv", "webm"],
  audio: ["mp3", "wav", "ogg", "flac", "aac", "wma"],
  document: ["doc", "docx", "odt"],
  text: ["txt", "md", "rtf", "csv", "log"],
  ebook: ["epub", "mobi"],
  font: ["ttf", "otf", "woff", "woff2"],
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
  package: ["jar", "deb", "rpm", "apk", "dmg"],
  database: ["sql", "db", "sqlite", "sqlite3"],
  iso: ["iso", "img"],
  cert: ["pem", "crt", "cer"],
  binary: ["bin"],
  shortcut: ["lnk"],
  config: ["ini", "cfg", "conf", "env"],
};

export type FileType =
  | "folder"
  | "pdf"
  | "spreadsheet"
  | "presentation"
  | "ebook"
  | "font"
  | "image"
  | "vector"
  | "video"
  | "audio"
  | "document"
  | "text"
  | "code"
  | "archive"
  | "executable"
  | "package"
  | "database"
  | "iso"
  | "cert"
  | "binary"
  | "shortcut"
  | "config"
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

export function getParent(path: string): string {
  const i = Math.max(path.lastIndexOf("\\"), path.lastIndexOf("/"));
  if (i < 0) return path;
  const parent = path.slice(0, i);
  if (/^[A-Za-z]:$/.test(parent)) return parent + "\\";
  return parent;
}
