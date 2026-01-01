import { useCallback } from "react"
import { useNavigationStore } from "@/features/navigation"
import { useSearchStore } from "@/features/search-content"
import { TabBar } from "@/features/tabs"
import { WindowControls } from "@/widgets"

interface TabBarSectionProps {
  className?: string
}

export function TabBarSection({ className }: TabBarSectionProps) {
  const navigate = useNavigationStore((s) => s.navigate)
  const resetSearch = useSearchStore((s) => s.reset)

  const handleTabChange = useCallback(
    (path: string) => {
      navigate(path)
      resetSearch()
    },
    [navigate, resetSearch],
  )

  return (
    <TabBar onTabChange={handleTabChange} className={className} controls={<WindowControls />} />
  )
}
