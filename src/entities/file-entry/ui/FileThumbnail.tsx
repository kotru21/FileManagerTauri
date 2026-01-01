import { memo, useEffect, useRef, useState } from "react"
import { canShowThumbnail, getLocalImageUrl } from "@/shared/lib"
import { FileIcon } from "./FileIcon"

interface FileThumbnailProps {
  path: string
  extension: string | null
  isDir: boolean
  size: number
  className?: string
  performanceSettings?: {
    lazyLoadImages: boolean
    thumbnailCacheSize: number
  }
  useContain?: boolean
  thumbnailGenerator?: { maxSide: number }
}

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

const thumbnailCache = new Map<string, string>()
function maybeCacheThumbnail(path: string, url: string, maxSize: number) {
  if (thumbnailCache.has(path)) {
    thumbnailCache.delete(path)
    thumbnailCache.set(path, url)
    return
  }

  thumbnailCache.set(path, url)
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

  // Backend thumbnail generation is intended for raster images.
  // For SVG we prefer the native <img src="file://..."> path.
  const lowerExt = extension?.toLowerCase() ?? null
  const useBackendThumbnailGenerator = Boolean(
    thumbnailGenerator && lowerExt && lowerExt !== "svg" && lowerExt !== "svgz",
  )

  const performanceDefaults = { lazyLoadImages: true, thumbnailCacheSize: 100 }
  const performance = performanceSettings ?? performanceDefaults
  useEffect(() => {
    if (!showThumbnail || !containerRef.current) return

    if (!performance.lazyLoadImages) {
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
        rootMargin: "100px",
        threshold: 0,
      },
    )

    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [showThumbnail, performance.lazyLoadImages])
  useEffect(() => {
    if (!isVisible || !showThumbnail) return
    if (shouldLoad && !useBackendThumbnailGenerator) return

    if (useBackendThumbnailGenerator) {
      setShouldLoad(true)

      const generatorMaxSide = thumbnailGenerator?.maxSide
      if (!generatorMaxSide) {
        loadingPool.acquire(() => setShouldLoad(true))
        return
      }

      ;(async () => {
        try {
          const smallSide = Math.max(16, Math.min(64, Math.floor(generatorMaxSide / 4)))

          const tSmall = await import("@/shared/api/tauri/client").then((m) =>
            m.tauriClient.getThumbnail(path, smallSide),
          )
          if (!tSmall) throw new Error("no thumbnail")
          const lqip = `data:${tSmall.mime};base64,${tSmall.base64}`
          setLqipSrc(lqip)

          await new Promise((res) => setTimeout(res, 0))

          try {
            const tFull = await import("@/shared/api/tauri/client").then((m) =>
              m.tauriClient.getThumbnail(path, generatorMaxSide),
            )
            if (!tFull) throw new Error("no thumbnail")
            const full = `data:${tFull.mime};base64,${tFull.base64}`
            maybeCacheThumbnail(path, full, performance.thumbnailCacheSize)
            setIsLoaded(true)
            return
          } catch {
            loadingPool.acquire(() => setShouldLoad(true))
            return
          }
        } catch {
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
      void 0
    }
  }, [
    isVisible,
    showThumbnail,
    shouldLoad,
    useBackendThumbnailGenerator,
    thumbnailGenerator?.maxSide,
    path,
    performance.thumbnailCacheSize,
  ])
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
          void 0
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
      {!isLoaded && <FileIcon extension={extension} isDir={isDir} size={size} />}
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

export const __thumbnailCache = thumbnailCache
export const __maybeCacheThumbnail = maybeCacheThumbnail
