import { memo, useEffect, useRef, useState } from "react"
import { usePerformanceSettings } from "@/features/settings"
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
  maxConcurrent: 3,
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

// Simple LRU cache for thumbnails to respect thumbnailCacheSize setting
const thumbnailCache = new Map<string, string>()
function maybeCacheThumbnail(path: string, url: string, maxSize: number) {
  if (thumbnailCache.has(path)) {
    // Move to newest
    thumbnailCache.delete(path)
    thumbnailCache.set(path, url)
    return
  }

  thumbnailCache.set(path, url)
  // Trim cache if needed
  while (thumbnailCache.size > maxSize) {
    const firstKey = thumbnailCache.keys().next().value
    if (firstKey) {
      thumbnailCache.delete(firstKey)
    } else {
      break
    }
  }
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

  const performance = usePerformanceSettings()

  // Intersection observer for lazy loading (or eager load based on settings)
  useEffect(() => {
    if (!showThumbnail || !containerRef.current) return

    if (!performance.lazyLoadImages) {
      setIsVisible(true)
      return
    }

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
  }, [showThumbnail, performance.lazyLoadImages])

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

    const url = imageRef.current?.src
    if (url) {
      maybeCacheThumbnail(path, url, performance.thumbnailCacheSize)
    }
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

  const src = thumbnailCache.get(path) ?? getLocalImageUrl(path)

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
          src={src}
          alt=""
          onLoad={handleLoad}
          onError={handleError}
          className="absolute inset-0 w-full h-full object-cover rounded"
          style={{
            opacity: isLoaded ? 1 : 0,
            transition: "opacity var(--transition-duration) ease-in-out",
          }}
          loading={performance.lazyLoadImages ? "lazy" : "eager"}
          decoding="async"
        />
      )}
    </div>
  )
})
