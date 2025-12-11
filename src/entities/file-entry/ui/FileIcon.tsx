import {
  File,
  Folder,
  Image,
  Video,
  Music,
  FileText,
  FileCode,
  Archive,
  FileQuestion,
  FileSpreadsheet,
  FileLock,
  Database,
  FileChartLine,
  Type,
  Disc,
  Package,
  Key,
  FileCog,
  FileAxis3d,
  BookOpen,
  Link,
  type LucideIcon,
} from "lucide-react";
import { getFileType, type FileType } from "@/shared/lib";

const ICON_MAP: Record<FileType, LucideIcon> = {
  folder: Folder,
  pdf: FileText,
  spreadsheet: FileSpreadsheet,
  presentation: FileChartLine,
  ebook: BookOpen,
  font: Type,
  image: Image,
  vector: FileAxis3d,
  video: Video,
  audio: Music,
  document: FileText,
  text: FileText,
  code: FileCode,
  archive: Archive,
  executable: File,
  package: Package,
  database: Database,
  iso: Disc,
  cert: Key,
  binary: File,
  shortcut: Link,
  config: FileCog,
  unknown: FileQuestion,
};

const COLOR_MAP: Record<FileType, string> = {
  folder: "text-yellow-500",
  pdf: "text-red-500",
  spreadsheet: "text-green-600",
  presentation: "text-purple-500",
  ebook: "text-indigo-500",
  font: "text-gray-600",
  image: "text-green-500",
  vector: "text-teal-500",
  video: "text-purple-500",
  audio: "text-pink-500",
  document: "text-red-500",
  text: "text-gray-500",
  code: "text-blue-500",
  archive: "text-orange-500",
  executable: "text-gray-700",
  package: "text-orange-600",
  database: "text-amber-600",
  iso: "text-gray-500",
  cert: "text-emerald-600",
  binary: "text-gray-700",
  shortcut: "text-sky-500",
  config: "text-cyan-500",
  unknown: "text-gray-400",
};

interface FileIconProps {
  extension: string | null;
  isDir: boolean;
  className?: string;
  size?: number;
}

export function FileIcon({
  extension,
  isDir,
  className = "",
  size = 20,
}: FileIconProps) {
  const fileType = getFileType(extension, isDir);
  const Icon = ICON_MAP[fileType];
  const colorClass = COLOR_MAP[fileType];

  return <Icon size={size} className={`${colorClass} ${className}`} />;
}
