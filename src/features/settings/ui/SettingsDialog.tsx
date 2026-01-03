import { Download, RotateCcw, Upload, X } from "lucide-react"
import { memo, useCallback, useRef } from "react"
import { useSettingsStore } from "@/entities/app-settings"
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, Separator } from "@/shared/ui"
import { toast } from "@/shared/ui/toast"
import { AppearanceSettings } from "./AppearanceSettings"
import { BehaviorSettings } from "./BehaviorSettings"
import { FileDisplaySettings } from "./FileDisplaySettings"
import { KeyboardSettings } from "./KeyboardSettings"
import { LayoutSettings } from "./LayoutSettings"
import { PerformanceSettings } from "./PerformanceSettings"
import { type SettingsTabId, SettingsTabs } from "./SettingsTabs"

export const SettingsDialog = memo(function SettingsDialog() {
  const { isOpen, close, activeTab, setActiveTab, exportSettings, importSettings, resetSettings } =
    useSettingsStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleTabChange = useCallback((tab: SettingsTabId) => setActiveTab(tab), [setActiveTab])

  const handleExport = useCallback(() => {
    const json = exportSettings()
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "file-manager-settings.json"
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Настройки экспортированы")
  }, [exportSettings])

  const handleImport = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (event) => {
        const json = event.target?.result as string
        if (importSettings(json)) {
          toast.success("Настройки импортированы")
        } else {
          toast.error("Ошибка импорта настроек")
        }
      }
      reader.readAsText(file)
      e.target.value = ""
    },
    [importSettings],
  )

  const handleReset = useCallback(() => {
    if (confirm("Сбросить все настройки к значениям по умолчанию?")) {
      resetSettings()
      toast.success("Настройки сброшены")
    }
  }, [resetSettings])

  const renderContent = () => {
    switch (activeTab) {
      case "appearance":
        return <AppearanceSettings />
      case "layout":
        return <LayoutSettings />
      case "behavior":
        return <BehaviorSettings />
      case "fileDisplay":
        return <FileDisplaySettings />
      case "performance":
        return <PerformanceSettings />
      case "keyboard":
        return <KeyboardSettings />
      default:
        return <AppearanceSettings />
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent hideDefaultClose className="max-w-3xl h-150 flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <DialogTitle>Настройки</DialogTitle>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button variant="ghost" size="sm" onClick={handleImport} title="Импорт настроек">
                <Upload size={16} />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleExport} title="Экспорт настроек">
                <Download size={16} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                title="Сбросить все настройки"
              >
                <RotateCcw size={16} />
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <Button variant="ghost" size="icon" onClick={close} title="Закрыть настройки">
                <X size={18} />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-1 min-h-0">
          <div className="py-4 pl-4">
            <SettingsTabs activeTab={activeTab} onTabChange={handleTabChange} />
          </div>
          <div className="flex-1 py-4 px-6 overflow-hidden">{renderContent()}</div>
        </div>
      </DialogContent>
    </Dialog>
  )
})
