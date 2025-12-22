import { FileText, Gauge, Keyboard, Layout, Monitor, MousePointer } from "lucide-react"
import { memo, useCallback } from "react"
import { cn } from "@/shared/lib"

export type SettingsTabId =
  | "appearance"
  | "behavior"
  | "fileDisplay"
  | "layout"
  | "performance"
  | "keyboard"

interface Tab {
  id: SettingsTabId
  label: string
  icon: React.ReactNode
}

const tabs: Tab[] = [
  { id: "appearance", label: "Внешний вид", icon: <Monitor size={18} /> },
  { id: "layout", label: "Лейаут", icon: <Layout size={18} /> },
  { id: "behavior", label: "Поведение", icon: <MousePointer size={18} /> },
  { id: "fileDisplay", label: "Отображение", icon: <FileText size={18} /> },
  { id: "performance", label: "Производительность", icon: <Gauge size={18} /> },
  { id: "keyboard", label: "Клавиатура", icon: <Keyboard size={18} /> },
]

interface SettingsTabsProps {
  activeTab: string
  onTabChange: (tab: SettingsTabId) => void
}

export const SettingsTabs = memo(function SettingsTabs({
  activeTab,
  onTabChange,
}: SettingsTabsProps) {
  const handleClick = useCallback((tabId: SettingsTabId) => () => onTabChange(tabId), [onTabChange])

  return (
    <nav className="flex flex-col gap-1 w-48 shrink-0 border-r border-border pr-4">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={handleClick(tab.id)}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors text-left",
            activeTab === tab.id
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
          )}
        >
          {tab.icon}
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  )
})
