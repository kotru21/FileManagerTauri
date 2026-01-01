import { useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"
import { fileKeys } from "@/entities/file-entry"
import { useInlineEditStore } from "@/features/inline-edit"
import { useLayoutStore } from "@/features/layout"
import { useNavigationStore } from "@/features/navigation"
import { useLayoutSettings } from "@/features/settings"
import { Breadcrumbs, Toolbar } from "@/widgets"

export function HeaderSection() {
  const layoutSettings = useLayoutSettings()
  const { layout: panelLayout, setLayout } = useLayoutStore()
  const currentPath = useNavigationStore((s) => s.currentPath)
  const queryClient = useQueryClient()

  const startNewFolder = useInlineEditStore((s) => s.startNewFolder)
  const startNewFile = useInlineEditStore((s) => s.startNewFile)

  const handleRefresh = useCallback(() => {
    if (currentPath) {
      queryClient.invalidateQueries({ queryKey: fileKeys.directory(currentPath) })
    }
  }, [currentPath, queryClient])

  const handleNewFolder = useCallback(() => {
    if (currentPath) {
      startNewFolder(currentPath)
    }
  }, [currentPath, startNewFolder])

  const handleNewFile = useCallback(() => {
    if (currentPath) {
      startNewFile(currentPath)
    }
  }, [currentPath, startNewFile])

  const handleTogglePreview = useCallback(() => {
    setLayout({ showPreview: !panelLayout.showPreview })
  }, [panelLayout.showPreview, setLayout])

  return (
    <div className="shrink-0">
      {/* Breadcrumbs */}
      {layoutSettings.showBreadcrumbs && (
        <div className="px-3 py-2 border-b">
          <Breadcrumbs />
        </div>
      )}

      {/* Toolbar */}
      {layoutSettings.showToolbar && (
        <Toolbar
          onRefresh={handleRefresh}
          onNewFolder={handleNewFolder}
          onNewFile={handleNewFile}
          onTogglePreview={handleTogglePreview}
          showPreview={panelLayout.showPreview}
        />
      )}
    </div>
  )
}
