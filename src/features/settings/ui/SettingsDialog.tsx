import { RotateCcw } from "lucide-react"
import { useCallback } from "react"
import { cn } from "@/shared/lib"
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  ScrollArea,
  Separator,
} from "@/shared/ui"
import { type AppSettings, useSettingsStore } from "../model/store"

interface SettingItemProps {
  label: string
  description?: string
  children: React.ReactNode
}

function SettingItem({ label, description, children }: SettingItemProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="space-y-0.5">
        <div className="text-sm font-medium">{label}</div>
        {description && <div className="text-xs text-muted-foreground">{description}</div>}
      </div>
      <div>{children}</div>
    </div>
  )
}

interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
}

function ToggleSwitch({ checked, onChange }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent",
        "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        checked ? "bg-primary" : "bg-input",
      )}
    >
      <span
        className={cn(
          "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform",
          checked ? "translate-x-5" : "translate-x-0",
        )}
      />
    </button>
  )
}

interface SelectProps {
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}

function Select({ value, options, onChange }: SelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

export function SettingsDialog() {
  const { settings, isOpen, close, updateSettings, resetSettings } = useSettingsStore()

  const handleUpdate = useCallback(
    <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
      updateSettings({ [key]: value })
    },
    [updateSettings],
  )

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Настройки</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 pb-4">
            {/* Appearance */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Внешний вид</h3>
              <div className="space-y-1">
                <SettingItem label="Тема" description="Цветовая схема приложения">
                  <Select
                    value={settings.theme}
                    options={[
                      { value: "dark", label: "Тёмная" },
                      { value: "light", label: "Светлая" },
                      { value: "system", label: "Системная" },
                    ]}
                    onChange={(v) => handleUpdate("theme", v as AppSettings["theme"])}
                  />
                </SettingItem>

                <SettingItem label="Размер шрифта">
                  <Select
                    value={settings.fontSize}
                    options={[
                      { value: "small", label: "Маленький" },
                      { value: "medium", label: "Средний" },
                      { value: "large", label: "Большой" },
                    ]}
                    onChange={(v) => handleUpdate("fontSize", v as AppSettings["fontSize"])}
                  />
                </SettingItem>

                <SettingItem label="Анимации" description="Включить анимации интерфейса">
                  <ToggleSwitch
                    checked={settings.enableAnimations}
                    onChange={(v) => handleUpdate("enableAnimations", v)}
                  />
                </SettingItem>
              </div>
            </div>

            <Separator />

            {/* Behavior */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Поведение</h3>
              <div className="space-y-1">
                <SettingItem
                  label="Подтверждение удаления"
                  description="Запрашивать подтверждение при удалении файлов"
                >
                  <ToggleSwitch
                    checked={settings.confirmDelete}
                    onChange={(v) => handleUpdate("confirmDelete", v)}
                  />
                </SettingItem>

                <SettingItem
                  label="Двойной клик для открытия"
                  description="Открывать файлы двойным кликом"
                >
                  <ToggleSwitch
                    checked={settings.doubleClickToOpen}
                    onChange={(v) => handleUpdate("doubleClickToOpen", v)}
                  />
                </SettingItem>
              </div>
            </div>

            <Separator />

            {/* File display */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Отображение файлов</h3>
              <div className="space-y-1">
                <SettingItem label="Показывать расширения файлов">
                  <ToggleSwitch
                    checked={settings.showFileExtensions}
                    onChange={(v) => handleUpdate("showFileExtensions", v)}
                  />
                </SettingItem>

                <SettingItem label="Показывать размер файлов">
                  <ToggleSwitch
                    checked={settings.showFileSizes}
                    onChange={(v) => handleUpdate("showFileSizes", v)}
                  />
                </SettingItem>

                <SettingItem label="Показывать даты">
                  <ToggleSwitch
                    checked={settings.showFileDates}
                    onChange={(v) => handleUpdate("showFileDates", v)}
                  />
                </SettingItem>

                <SettingItem label="Формат даты">
                  <Select
                    value={settings.dateFormat}
                    options={[
                      { value: "relative", label: "Относительный" },
                      { value: "absolute", label: "Абсолютный" },
                    ]}
                    onChange={(v) => handleUpdate("dateFormat", v as AppSettings["dateFormat"])}
                  />
                </SettingItem>
              </div>
            </div>

            <Separator />

            {/* Reset */}
            <div>
              <Button variant="outline" onClick={resetSettings} className="w-full">
                <RotateCcw className="h-4 w-4 mr-2" />
                Сбросить настройки
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
