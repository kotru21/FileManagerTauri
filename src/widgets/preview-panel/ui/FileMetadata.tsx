import type { FileEntry } from "@/shared/api/tauri"
import { cn, formatBytes, formatDate, getExtension } from "@/shared/lib"

export default function FileMetadata({ file }: { file: FileEntry }) {
  const extension = getExtension(file.name)

  return (
    <div className="border-t border-border p-4 space-y-2 text-sm">
      <MetadataRow label="Тип" value={file.is_dir ? "Папка" : extension?.toUpperCase() || "Файл"} />
      {!file.is_dir && <MetadataRow label="Размер" value={formatBytes(file.size)} />}
      {file.modified && <MetadataRow label="Изменён" value={formatDate(file.modified)} />}
      {file.created && <MetadataRow label="Создан" value={formatDate(file.created)} />}
      <MetadataRow label="Путь" value={file.path} className="break-all" />
    </div>
  )
}

function MetadataRow({
  label,
  value,
  className,
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div className="flex gap-2">
      <span className="text-muted-foreground shrink-0">{label}:</span>
      <span className={cn("text-foreground", className)}>{value}</span>
    </div>
  )
}
