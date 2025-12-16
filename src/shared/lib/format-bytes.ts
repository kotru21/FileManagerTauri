const UNITS = ["B", "KB", "MB", "GB", "TB", "PB"]

export function formatBytes(bytes: number | undefined | null, decimals = 1): string {
  if (bytes == null || Number.isNaN(bytes)) return "—"
  if (bytes === 0) return "0 B"
  if (bytes < 0) return "—"

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / k ** i).toFixed(dm))} ${UNITS[i]}`
}
