import { useEffect } from "react"
import { initLayoutSync } from "@/features/layout/sync"

export function useSyncLayoutWithSettings() {
  useEffect(() => {
    const cleanup = initLayoutSync()
    return () => cleanup?.()
  }, [])
}
