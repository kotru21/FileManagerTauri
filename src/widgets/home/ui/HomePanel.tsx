import { FrequentSection, PinnedSection } from "@/features/home"
import { useLayoutStore } from "@/features/layout"
import { useNavigationStore } from "@/features/navigation"
import { VIEW_MODES } from "@/shared/config"

export function HomePanel() {
  const viewMode = useLayoutStore((s) => s.layout.viewMode ?? VIEW_MODES.list)
  const navigate = useNavigationStore((s) => s.navigate)

  return (
    <div className="flex-1 flex flex-col overflow-auto p-4" role="main">
      <h1 className="text-lg font-semibold mb-4">Главная</h1>
      <div className="space-y-6">
        <PinnedSection viewMode={viewMode} onOpenDir={(p) => navigate(p)} />
        <FrequentSection viewMode={viewMode} onOpenDir={(p) => navigate(p)} />
      </div>
    </div>
  )
}

export default HomePanel
