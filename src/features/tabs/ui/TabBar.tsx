import { Pin, Plus, X } from "lucide-react"
import { useCallback, useRef, useState } from "react"
import { cn } from "@/shared/lib"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/shared/ui"
import { WindowControls } from "@/widgets"
import { type Tab, useTabsStore } from "../model/store"

interface TabBarProps {
  onTabChange?: (path: string) => void
  className?: string
}

interface TabItemProps {
  tab: Tab
  isActive: boolean
  onSelect: () => void
  onClose: () => void
  onContextMenu: (action: string) => void
  onDragStart: (e: React.DragEvent, index: number) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, index: number) => void
  index: number
}

function TabItem({
  tab,
  isActive,
  onSelect,
  onClose,
  onContextMenu,
  onDragStart,
  onDragOver,
  onDrop,
  index,
}: TabItemProps) {
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
    onDragOver(e)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    setIsDragOver(false)
    onDrop(e, index)
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          draggable
          onDragStart={(e) => onDragStart(e, index)}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={onSelect}
          className={cn(
            "group relative flex h-8 min-w-30 max-w-50 cursor-pointer items-center gap-2 border-r border-border/50 px-3 text-sm transition-colors no-drag",
            isActive
              ? "bg-background text-foreground"
              : "bg-muted/30 text-muted-foreground hover:bg-muted/50",
            isDragOver && "bg-accent",
          )}
        >
          {tab.isPinned && <Pin className="h-3.5 w-3.5" />}

          {!tab.isPinned && (
            <>
              <span className="truncate text-sm">{tab.title}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onClose()
                }}
                className={cn(
                  "ml-auto rounded p-0.5 opacity-0 transition-opacity hover:bg-accent",
                  "group-hover:opacity-100",
                  isActive && "opacity-100",
                )}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          )}

          {/* Active indicator */}
          {isActive && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent>
        <ContextMenuItem onClick={() => onContextMenu("duplicate")}>
          Дублировать вкладку
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onContextMenu(tab.isPinned ? "unpin" : "pin")}>
          {tab.isPinned ? "Открепить" : "Закрепить"}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => onContextMenu("close")} disabled={tab.isPinned}>
          Закрыть
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onContextMenu("closeOthers")}>
          Закрыть другие
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onContextMenu("closeRight")}>
          Закрыть вкладки справа
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => onContextMenu("closeAll")}>Закрыть все</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

export function TabBar({ onTabChange, className }: TabBarProps) {
  const {
    tabs,
    activeTabId,
    addTab,
    closeTab,
    setActiveTab,
    moveTab,
    duplicateTab,
    pinTab,
    unpinTab,
    closeOtherTabs,
    closeTabsToRight,
    closeAllTabs,
  } = useTabsStore()

  const dragIndexRef = useRef<number | null>(null)

  const handleSelect = useCallback(
    (tab: Tab) => {
      setActiveTab(tab.id)
      onTabChange?.(tab.path)
    },
    [setActiveTab, onTabChange],
  )

  const handleNewTab = useCallback(() => {
    const id = addTab("", "New Tab")
    const tab = useTabsStore.getState().getTabById(id)
    if (tab) {
      onTabChange?.(tab.path)
    }
  }, [addTab, onTabChange])

  const handleContextMenu = useCallback(
    (tabId: string, action: string) => {
      switch (action) {
        case "close":
          closeTab(tabId)
          break
        case "closeOthers":
          closeOtherTabs(tabId)
          break
        case "closeRight":
          closeTabsToRight(tabId)
          break
        case "closeAll":
          closeAllTabs()
          break
        case "duplicate":
          duplicateTab(tabId)
          break
        case "pin":
          pinTab(tabId)
          break
        case "unpin":
          unpinTab(tabId)
          break
      }
    },
    [closeTab, closeOtherTabs, closeTabsToRight, closeAllTabs, duplicateTab, pinTab, unpinTab],
  )

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    dragIndexRef.current = index
    e.dataTransfer.effectAllowed = "move"
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent, toIndex: number) => {
      e.preventDefault()
      const fromIndex = dragIndexRef.current
      if (fromIndex !== null && fromIndex !== toIndex) {
        moveTab(fromIndex, toIndex)
      }
      dragIndexRef.current = null
    },
    [moveTab],
  )

  if (tabs.length === 0) {
    return null
  }

  return (
    <div
      className={cn(
        "flex h-9 items-center bg-muted/50 border-b border-border select-none",
        className,
      )}
    >
      {/* Drag region (occupies remaining space to push controls to the right) */}
      <div data-tauri-drag-region className="flex-1 flex items-center h-full min-w-0">
        {/* Tabs */}
        <div className="flex items-center h-full overflow-x-auto scrollbar-none">
          {tabs.map((tab, index) => (
            <TabItem
              key={tab.id}
              tab={tab}
              index={index}
              isActive={tab.id === activeTabId}
              onSelect={() => handleSelect(tab)}
              onClose={() => closeTab(tab.id)}
              onContextMenu={(action) => handleContextMenu(tab.id, action)}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            />
          ))}
        </div>

        {/* New tab button */}
        <button
          type="button"
          onClick={handleNewTab}
          className="flex h-8 w-8 shrink-0 items-center justify-center text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors ml-1"
          aria-label="Новая вкладка"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Window controls - aligned to the right */}
      <div className="flex items-center">
        <WindowControls />
      </div>
    </div>
  )
}
