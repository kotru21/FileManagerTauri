import { useQueryClient } from "@tanstack/react-query"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
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
  // Navigation
  const currentPath = useNavigationStore((s) => s.currentPath)

  // Tabs
  const { tabs, addTab, updateTabPath, getActiveTab } = useTabsStore()

  // Selection - use atomic selectors
  const selectedPaths = useSelectionStore((s) => s.selectedPaths)
  const lastSelectedPath = useSelectionStore((s) => s.lastSelectedPath)
  const clearSelection = useSelectionStore((s) => s.clearSelection)

  // Layout from settings
  const layoutSettings = useLayoutSettings()
  const { setLayout } = useLayoutStore()

  // Sync layout store with settings
  useSyncLayoutWithSettings()

  // Settings
  const openSettings = useSettingsStore((s) => s.open)

  // Delete confirmation
  const openDeleteConfirm = useDeleteConfirmStore((s) => s.open)

  // Operations history
  const addOperation = useOperationsHistoryStore((s) => s.addOperation)

  // Quick Look state
  const [quickLookFile, setQuickLookFile] = useState<FileEntry | null>(null)

  // Files cache for preview lookup
  const filesRef = useRef<FileEntry[]>([])

  // Query client for invalidation
  const queryClient = useQueryClient()

  // Initialize first tab if none exists
  useEffect(() => {
    if (tabs.length === 0 && currentPath) {
      addTab(currentPath)
    }
  }, [tabs.length, currentPath, addTab])

  // Sync tab path with navigation
  useEffect(() => {
    const activeTab = getActiveTab()
    if (activeTab && currentPath && activeTab.path !== currentPath) {
      updateTabPath(activeTab.id, currentPath)
    }
  }, [currentPath, getActiveTab, updateTabPath])

  const selectedFile = useMemo(() => {
    if (quickLookFile) return quickLookFile
    if (lastSelectedPath && filesRef.current.length > 0) {
      return filesRef.current.find((f) => f.path === lastSelectedPath) ?? null
    }
    return null
  }, [quickLookFile, lastSelectedPath])

  // Quick Look handler
  const handleQuickLook = useCallback(
    (file: FileEntry) => {
      setQuickLookFile(file)
      setLayout({ showPreview: true })
    },
    [setLayout],
  )

  // Close Quick Look on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && quickLookFile) {
        setQuickLookFile(null)
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [quickLookFile])

  const handleFilesChange = useCallback((files: FileEntry[]) => {
    filesRef.current = files
  }, [])

  // Handlers
  const handleRefresh = useCallback(() => {
    if (currentPath) {
      queryClient.invalidateQueries({ queryKey: fileKeys.directory(currentPath) })
    }
  }, [currentPath, queryClient])

  const performDelete = useCallback(async () => {
    const paths = Array.from(selectedPaths)
    if (paths.length === 0) return

    const confirmed = await openDeleteConfirm(paths, false)
    if (!confirmed) return

    try {
      await tauriClient.deleteEntries(paths, false)
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

  // Register commands
  useRegisterCommands({
    onRefresh: handleRefresh,
    onDelete: performDelete,
    onOpenSettings: openSettings,
  })

  // Show undo toast for last operation
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
        {/* Tab Bar */}
        <TabBarSection className="shrink-0" />

        {/* Header (Breadcrumbs + Toolbar) */}
        <HeaderSection />

        {/* Main Content with Resizable Panels */}
        <ResizablePanels
          onQuickLook={handleQuickLook}
          onFilesChange={handleFilesChange}
          selectedFile={selectedFile}
          onCloseQuickLook={() => setQuickLookFile(null)}
        />

        {/* Status Bar */}
        {layoutSettings.showStatusBar && <StatusBar />}

        {/* Global UI: Command palette, settings dialog, delete confirm */}
        <CommandPalette />
        <SettingsDialog />
        <DeleteConfirmDialog />
        <ConfirmDialog />
      </div>
    </TooltipProvider>
  )
}
