import { getCurrentWindow } from "@tauri-apps/api/window"
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
import { type Tab, useTabsStore } from "../model/store"

const appWindow = getCurrentWindow()

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
            "tab group relative flex h-9 min-w-30wmax-w-50or-pointer items-center gap-2 border-r border-border px-3",
            "transition-colors duration-150",
            isActive
              ? "bg-background text-foreground"
              : "bg-muted/50 text-muted-foreground hover:bg-muted",
            isDragOver && "bg-accent",
            tab.isPinned && "min-w-10 max-w-10 justify-center",
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

  const handleTitlebarMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    if (e.detail === 2) {
      void appWindow.toggleMaximize()
    } else {
      void appWindow.startDragging()
    }
  }, [])

  if (tabs.length === 0) {
    return null
  }

  return (
    <div className={cn("titlebar", className)}>
      <div data-tauri-drag-region id="titlebar-drag" onMouseDown={handleTitlebarMouseDown} />

      <div className="tabs">
        <div className="flex h-full flex-1 overflow-x-auto">
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
      </div>

      <div className="controls">
        <button
          type="button"
          onClick={handleNewTab}
          className="flex h-9 w-9 items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground"
          title="Новая вкладка (Ctrl+T)"
        >
          <Plus className="h-4 w-4" />
        </button>

        <button type="button" onClick={() => void appWindow.minimize()} title="Свернуть">
          —
        </button>
        <button
          type="button"
          onClick={() => void appWindow.toggleMaximize()}
          title="Развернуть/Свернуть"
        >
          □
        </button>
        <button type="button" onClick={() => void appWindow.close()} title="Закрыть">
          ✕
        </button>
      </div>
    </div>
  )
}
