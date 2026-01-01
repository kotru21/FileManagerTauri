import { useQueryClient } from "@tanstack/react-query"
import { useCallback, useEffect, useMemo, useRef } from "react"
import { fileKeys } from "@/entities/file-entry"
import { CommandPalette, useRegisterCommands } from "@/features/command-palette"
import { ConfirmDialog } from "@/features/confirm"
import { DeleteConfirmDialog, useDeleteConfirmStore } from "@/features/delete-confirm"
import { useSelectionStore } from "@/features/file-selection"
import { useLayoutStore } from "@/features/layout"
import { useNavigationStore } from "@/features/navigation"
import {
  createOperationDescription,
  useOperationsHistoryStore,
  useUndoToast,
} from "@/features/operations-history"
import { SettingsDialog, useLayoutSettings, useSettingsStore } from "@/features/settings"
import { useTabsStore } from "@/features/tabs"
import type { FileEntry } from "@/shared/api/tauri"
import { tauriClient } from "@/shared/api/tauri/client"
import { cn } from "@/shared/lib"
import { TooltipProvider, toast } from "@/shared/ui"
import { StatusBar } from "@/widgets"
import { useSyncLayoutWithSettings } from "../hooks/useSyncLayoutWithSettings"
import { HeaderSection } from "./HeaderSection"
import { ResizablePanels } from "./ResizablePanels"
import { TabBarSection } from "./TabBarSection"

export function FileBrowserPage() {
  const currentPath = useNavigationStore((s) => s.currentPath)
  const { tabs, addTab, updateTabPath, getActiveTab } = useTabsStore()
  const selectedPaths = useSelectionStore((s) => s.selectedPaths)
  const lastSelectedPath = useSelectionStore((s) => s.lastSelectedPath)
  const clearSelection = useSelectionStore((s) => s.clearSelection)
  const layoutSettings = useLayoutSettings()
  const showPreview = useLayoutStore((s) => s.layout.showPreview)
  const { setLayout } = useLayoutStore()
  useSyncLayoutWithSettings()
  const openSettings = useSettingsStore((s) => s.open)
  const openDeleteConfirm = useDeleteConfirmStore((s) => s.open)
  const addOperation = useOperationsHistoryStore((s) => s.addOperation)
  const filesRef = useRef<FileEntry[]>([])
  const queryClient = useQueryClient()
  useEffect(() => {
    if (tabs.length === 0 && currentPath) {
      addTab(currentPath)
    }
  }, [tabs.length, currentPath, addTab])
  useEffect(() => {
    const activeTab = getActiveTab()
    if (activeTab && currentPath && activeTab.path !== currentPath) {
      updateTabPath(activeTab.id, currentPath)
    }
  }, [currentPath, getActiveTab, updateTabPath])

  const selectedFile = useMemo(() => {
    if (lastSelectedPath && filesRef.current.length > 0) {
      return filesRef.current.find((f) => f.path === lastSelectedPath) ?? null
    }
    return null
  }, [lastSelectedPath])

  // Авто-показ панели предпросмотра при выборе файла/папки.
  useEffect(() => {
    if (!lastSelectedPath) return
    if (showPreview) return
    setLayout({ showPreview: true })
  }, [lastSelectedPath, showPreview, setLayout])

  const handleFilesChange = useCallback((files: FileEntry[]) => {
    filesRef.current = files
  }, [])
  const handleRefresh = useCallback(() => {
    if (currentPath) {
      queryClient.invalidateQueries({ queryKey: fileKeys.directory(currentPath) })
    }
  }, [currentPath, queryClient])

  const performDelete = useCallback(async () => {
    const paths = Array.from(selectedPaths)
    if (paths.length === 0) return

    const confirmed = await openDeleteConfirm(paths)
    if (!confirmed) return

    try {
      await tauriClient.deleteEntries(paths)
      toast.success(`Удалено: ${paths.length} элемент(ов)`)
      addOperation({
        type: "delete",
        description: createOperationDescription("delete", { deletedPaths: paths }),
        data: { deletedPaths: paths },
        canUndo: false,
      })
      clearSelection()
      handleRefresh()
    } catch (error) {
      toast.error(`Ошибка удаления: ${error}`)
    }
  }, [selectedPaths, openDeleteConfirm, addOperation, clearSelection, handleRefresh])
  useRegisterCommands({
    onRefresh: handleRefresh,
    onDelete: performDelete,
    onOpenSettings: openSettings,
  })
  useUndoToast((operation) => {
    toast.info(`Отмена: ${operation.description}`)
  })

  return (
    <TooltipProvider>
      <div
        className={cn(
          "flex flex-col h-screen bg-background text-foreground overflow-hidden",
          layoutSettings.compactMode && "compact-mode",
        )}
      >
        <TabBarSection className="shrink-0" />
        <HeaderSection />
        <ResizablePanels
          onFilesChange={handleFilesChange}
          selectedFile={selectedFile}
          onClosePreview={() => clearSelection()}
        />
        {layoutSettings.showStatusBar && <StatusBar />}
        <CommandPalette />
        <SettingsDialog />
        <DeleteConfirmDialog />
        <ConfirmDialog />
      </div>
    </TooltipProvider>
  )
}
