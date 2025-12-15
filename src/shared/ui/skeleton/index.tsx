/* biome-disable suspicious/noArrayIndexKey */
import { cn } from "@/shared/lib"

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn("bg-muted animate-pulse rounded", className)} />
}

interface FileListSkeletonProps {
  count?: number
}

export function FileListSkeleton({ count = 20 }: FileListSkeletonProps) {
  const children = [] as React.ReactNode[]
  for (let i = 0; i < count; i++) {
    children.push(
      <div key={`skeleton-${i}`} className="flex items-center gap-3 p-2 rounded">
        <div className="w-5 h-5 bg-muted animate-pulse rounded" />
        <div className="flex-1 h-4 bg-muted animate-pulse rounded" />
        <div className="w-20 h-4 bg-muted animate-pulse rounded" />
        <div className="w-32 h-4 bg-muted animate-pulse rounded" />
      </div>,
    )
  }

  return <div className="space-y-1 p-2">{children}</div>
}
