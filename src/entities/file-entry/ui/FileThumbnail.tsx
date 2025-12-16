import { memo, useState } from "react"
import { canShowThumbnail, getLocalImageUrl } from "@/shared/lib"
import { FileIcon } from "./FileIcon"

interface FileThumbnailProps {
  path: string
  extension: string | null
  isDir: boolean
  size: number
  className?: string
}

export const FileThumbnail = memo(function FileThumbnail({
  path,
  extension,
  isDir,
  size,
  className,
}: FileThumbnailProps) {
  const [hasError, setHasError] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  const showThumbnail = !isDir && canShowThumbnail(extension)

  if (!showThumbnail || hasError) {
    return <FileIcon extension={extension} isDir={isDir} size={size} className={className} />
  }

  return (
    <div className={className} style={{ width: size, height: size }}>
      {/* Show icon while loading */}
      {!isLoaded && <FileIcon extension={extension} isDir={isDir} size={size} />}

      {/* Thumbnail image */}
      <img
        src={getLocalImageUrl(path)}
        alt=""
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={`
          object-cover rounded
          ${isLoaded ? "block" : "hidden"}
        `}
        style={{ width: size, height: size }}
      />
    </div>
  )
})
