import { memo, useEffect, useRef, useState } from "react"
import { canShowThumbnail, getLocalImageUrl } from "@/shared/lib"
import { FileIcon } from "./FileIcon"

interface FileThumbnailProps {
  path: string
  extension: string | null
  isDir: boolean
  size: number
  className?: string
}

// Shared loading pool to limit concurrent image loads
const loadingPool = {
  active: 0,
  maxConcurrent: 5,
  queue: [] as (() => void)[],

  acquire(callback: () => void) {
    if (this.active < this.maxConcurrent) {
      this.active++
      callback()
    } else {
      this.queue.push(callback)
    }
  },

  release() {
    this.active--
    if (this.queue.length > 0 && this.active < this.maxConcurrent) {
      const next = this.queue.shift()
      if (next) {
        this.active++
        next()
      }
    }
  },
}

export const FileThumbnail = memo(function FileThumbnail({
  path,
  extension,
  isDir,
  size,
  className,
}: FileThumbnailProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [shouldLoad, setShouldLoad] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)

  const showThumbnail = canShowThumbnail(extension) && !isDir

  // Intersection observer for lazy loading
  useEffect(() => {
    if (!showThumbnail || !containerRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      {
        rootMargin: "100px", // Start loading slightly before visible
        threshold: 0,
      },
    )

    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [showThumbnail])

  // Load image when visible (with pool limiting)
  useEffect(() => {
    if (!isVisible || !showThumbnail || shouldLoad) return

    loadingPool.acquire(() => {
      setShouldLoad(true)
    })

    return () => {
      // Don't release here - release when image loads or errors
    }
  }, [isVisible, showThumbnail, shouldLoad])

  // Handle image load complete
  const handleLoad = () => {
    setIsLoaded(true)
    loadingPool.release()
  }

  const handleError = () => {
    setHasError(true)
    loadingPool.release()
  }

  if (!showThumbnail || hasError) {
    return (
      <div ref={containerRef} className={className}>
        <FileIcon extension={extension} isDir={isDir} size={size} />
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: size, height: size, position: "relative" }}
    >
      {/* Show icon while loading */}
      {!isLoaded && <FileIcon extension={extension} isDir={isDir} size={size} />}

      {/* Thumbnail image - only render when should load */}
      {shouldLoad && (
        <img
          ref={imageRef}
          src={getLocalImageUrl(path)}
          alt=""
          onLoad={handleLoad}
          onError={handleError}
          className="absolute inset-0 w-full h-full object-cover rounded"
          style={{
            opacity: isLoaded ? 1 : 0,
            transition: "opacity 150ms ease-in-out",
          }}
          loading="lazy"
          decoding="async"
        />
      )}
    </div>
  )
})
