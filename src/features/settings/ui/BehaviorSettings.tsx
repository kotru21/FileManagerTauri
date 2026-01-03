import { MousePointer, RotateCcw } from "lucide-react"
import { memo } from "react"
import { useBehaviorSettings, useSettingsStore } from "@/entities/app-settings"
import { cn } from "@/shared/lib"
import { Button, ScrollArea, Separator } from "@/shared/ui"

interface SettingItemProps {
  label: string
  description?: string
  children: React.ReactNode
}

const SettingItem = memo(function SettingItem({ label, description, children }: SettingItemProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div className="flex-1">
        <span className="text-sm font-medium">{label}</span>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  )
})

interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
}

const ToggleSwitch = memo(function ToggleSwitch({ checked, onChange }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative w-10 h-5 rounded-full transition-colors shrink-0",
        checked ? "bg-primary" : "bg-secondary",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform",
          checked && "translate-x-5",
        )}
      />
    </button>
  )
})

export const BehaviorSettings = memo(function BehaviorSettings() {
  const behavior = useBehaviorSettings()
  const { updateBehavior, resetSection } = useSettingsStore()

  return (
    <ScrollArea className="h-125 pr-4">
      <div className="space-y-6">
        {/* Confirmations */}
        <section>
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <MousePointer size={16} />
            Подтверждения
          </h3>
          <div className="space-y-3">
            <SettingItem
              label="Подтверждать удаление"
              description="Показывать диалог при удалении файлов"
            >
              <ToggleSwitch
                checked={behavior.confirmDelete}
                onChange={(v) => updateBehavior({ confirmDelete: v })}
              />
            </SettingItem>
            <SettingItem
              label="Подтверждать перезапись"
              description="Спрашивать при замене существующих файлов"
            >
              <ToggleSwitch
                checked={behavior.confirmOverwrite}
                onChange={(v) => updateBehavior({ confirmOverwrite: v })}
              />
            </SettingItem>
          </div>
        </section>

        <Separator />

        {/* Click Behavior */}
        <section>
          <h3 className="text-sm font-medium mb-3">Поведение кликов</h3>
          <div className="space-y-3">
            <SettingItem
              label="Двойной клик для открытия"
              description="Открывать файлы/папки двойным кликом"
            >
              <ToggleSwitch
                checked={behavior.doubleClickToOpen}
                onChange={(v) => updateBehavior({ doubleClickToOpen: v })}
              />
            </SettingItem>
            <SettingItem
              label="Одиночный клик для выбора"
              description="Выбирать элементы одним кликом"
            >
              <ToggleSwitch
                checked={behavior.singleClickToSelect}
                onChange={(v) => updateBehavior({ singleClickToSelect: v })}
              />
            </SettingItem>
          </div>
        </section>

        <Separator />

        {/* Auto Features */}
        <section>
          <h3 className="text-sm font-medium mb-3">Автоматизация</h3>
          <div className="space-y-3">
            <SettingItem
              label="Авто-обновление при фокусе"
              description="Обновлять содержимое при возврате в приложение"
            >
              <ToggleSwitch
                checked={behavior.autoRefreshOnFocus}
                onChange={(v) => updateBehavior({ autoRefreshOnFocus: v })}
              />
            </SettingItem>
            <SettingItem
              label="Запоминать последний путь"
              description="Открывать последнюю папку при запуске"
            >
              <ToggleSwitch
                checked={behavior.rememberLastPath}
                onChange={(v) => updateBehavior({ rememberLastPath: v })}
              />
            </SettingItem>
            <SettingItem
              label="Папки в новой вкладке"
              description="Открывать папки в новой вкладке по Ctrl+Click"
            >
              <ToggleSwitch
                checked={behavior.openFoldersInNewTab}
                onChange={(v) => updateBehavior({ openFoldersInNewTab: v })}
              />
            </SettingItem>
          </div>
        </section>

        <Separator />

        <div className="flex justify-end pt-2">
          <Button variant="outline" size="sm" onClick={() => resetSection("behavior")}>
            <RotateCcw size={14} className="mr-2" />
            Сбросить
          </Button>
        </div>
      </div>
    </ScrollArea>
  )
})
