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
  type LucideIcon,
} from "lucide-react";
import { getFileType, type FileType } from "@/shared/lib";

const ICON_MAP: Record<FileType, LucideIcon> = {
  folder: Folder,
  image: Image,
  video: Video,
  audio: Music,
  document: FileText,
  text: FileText,
  code: FileCode,
  archive: Archive,
  executable: File,
  unknown: FileQuestion,
};

const COLOR_MAP: Record<FileType, string> = {
  folder: "text-yellow-500",
  image: "text-green-500",
  video: "text-purple-500",
  audio: "text-pink-500",
  document: "text-red-500",
  text: "text-gray-500",
  code: "text-blue-500",
  archive: "text-orange-500",
  executable: "text-gray-700",
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
