import { memo, useEffect, useRef, useState } from "react"
import { canShowThumbnail, getLocalImageUrl } from "@/shared/lib"
import { FileIcon } from "./FileIcon"

interface FileThumbnailProps {
  path: string
  extension: string | null
  isDir: boolean
  size: number
  className?: string
  // New prop: performance settings passed from higher layer
  performanceSettings?: {
    lazyLoadImages: boolean
    thumbnailCacheSize: number
  }
  // When true, use object-contain to avoid cropping (useful in grid mode)
  useContain?: boolean
  // Optional: ask Tauri to generate a small thumbnail (max side px)
  thumbnailGenerator?: { maxSide: number }
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
  performanceSettings,
  useContain,
  thumbnailGenerator,
}: FileThumbnailProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [shouldLoad, setShouldLoad] = useState(false)
  const [lqipSrc, setLqipSrc] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)

  const showThumbnail = canShowThumbnail(extension) && !isDir

  const performanceDefaults = { lazyLoadImages: true, thumbnailCacheSize: 100 }
  const performance = performanceSettings ?? performanceDefaults

  // Intersection observer for lazy loading (or eager load based on settings)
  useEffect(() => {
    if (!showThumbnail || !containerRef.current) return

    if (!performance.lazyLoadImages) {
      // Eager loading: enqueue load immediately via pool to respect concurrency
      setIsVisible(true)
      loadingPool.acquire(() => setShouldLoad(true))
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

  // Load image when visible (with pool limiting) or ask Tauri to generate thumbnail
  useEffect(() => {
    if (!isVisible || !showThumbnail) return
    // If we already decided to load (shouldLoad) and there's no thumbnailGenerator, skip
    if (shouldLoad && !thumbnailGenerator) return

    if (thumbnailGenerator) {
      // Ensure the image element is mounted so src/state-driven updates can apply
      setShouldLoad(true)

      // LQIP: request a tiny thumbnail first, show blurred LQIP, then request a larger thumbnail
      ;(async () => {
        try {
          const smallSide = Math.max(16, Math.min(64, Math.floor(thumbnailGenerator.maxSide / 4)))

          // small LQIP
          const tSmall = await import("@/shared/api/tauri/client").then((m) =>
            m.tauriClient.getThumbnail(path, smallSide),
          )
          if (!tSmall) throw new Error("no thumbnail")
          const lqip = `data:${tSmall.mime};base64,${tSmall.base64}`
          // Use state to drive the rendered src so it works even before the image ref is set
          setLqipSrc(lqip)

          // allow one tick so LQIP can render before we fetch/replace with full thumbnail
          await new Promise((res) => setTimeout(res, 0))

          // Try full thumbnail
          try {
            const tFull = await import("@/shared/api/tauri/client").then((m) =>
              m.tauriClient.getThumbnail(path, thumbnailGenerator.maxSide),
            )
            if (!tFull) throw new Error("no thumbnail")
            const full = `data:${tFull.mime};base64,${tFull.base64}`
            maybeCacheThumbnail(path, full, performance.thumbnailCacheSize)
            // mark loaded so render switches from lqip to full cached src
            setIsLoaded(true)
            return
          } catch {
            // If full thumb fails, fallback to pool-load of file://
            loadingPool.acquire(() => setShouldLoad(true))
            return
          }
        } catch {
          // If LQIP generation fails, fall back to pool-load of file://
          loadingPool.acquire(() => setShouldLoad(true))
          return
        }
      })()
      return
    }

    loadingPool.acquire(() => {
      setShouldLoad(true)
    })

    return () => {
      // Don't release here - release when image loads or errors
    }
  }, [
    isVisible,
    showThumbnail,
    shouldLoad,
    thumbnailGenerator,
    path,
    performance.thumbnailCacheSize,
  ])

  // Handle image load complete
  const handleLoad = () => {
    setIsLoaded(true)
    loadingPool.release()

    const url = imageRef.current?.src
    if (url) {
      maybeCacheThumbnail(path, url, performance.thumbnailCacheSize)
    }
  }

  const fallbackAttempted = useRef(false)

  const handleError = () => {
    // Try a fallback to tauri-based base64 preview once, in case file:// URL is blocked
    if (!fallbackAttempted.current) {
      fallbackAttempted.current = true
      ;(async () => {
        try {
          const p = (await import("@/shared/api/tauri/client").then((m) =>
            m.tauriClient.getFilePreview(path),
          )) as import("@/shared/api/tauri").FilePreview
          if (p && p.type === "Image") {
            const dataUrl = `data:${p.mime};base64,${p.base64}`
            if (imageRef.current) imageRef.current.src = dataUrl
            setHasError(false)
            setIsLoaded(true)
            maybeCacheThumbnail(path, dataUrl, performance.thumbnailCacheSize)
            loadingPool.release()
            return
          }
        } catch {
          // ignore
        }
        setHasError(true)
        loadingPool.release()
      })()
      return
    }

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

  const cached = thumbnailCache.get(path)
  const fileUrl = cached ?? getLocalImageUrl(path)
  const imgSrc = lqipSrc && !isLoaded ? lqipSrc : fileUrl

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
          src={imgSrc}
          alt=""
          onLoad={handleLoad}
          onError={handleError}
          className={`absolute inset-0 w-full h-full rounded ${useContain ? "object-contain" : "object-cover"} ${lqipSrc && !isLoaded ? "filter blur-sm scale-105" : ""}`}
          style={{
            opacity: isLoaded ? 1 : lqipSrc ? 1 : 0,
            transition: "opacity var(--transition-duration) ease-in-out",
          }}
          loading={performance.lazyLoadImages ? "lazy" : "eager"}
          decoding="async"
        />
      )}
    </div>
  )
})

// Test-only exports for verifying LRU cache behavior in unit tests
export const __thumbnailCache = thumbnailCache
export const __maybeCacheThumbnail = maybeCacheThumbnail
